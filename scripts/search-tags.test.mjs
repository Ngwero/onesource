import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import fixtures from '../shared/search-fixtures.json' with { type: 'json' };
import { productMatchesSearch, rankSearchResults, getProductSearchTags, queryVariants } from '../shared/productSearch.mjs';
import { rowToProduct } from '../server/db.js';
import { buildSearchOrFilter } from '../server/lib/productSearchMatch.js';

for (const fixture of fixtures) {
  test(`${fixture.query}: ${fixture.product.title}`, () => {
    assert.equal(productMatchesSearch(fixture.product, fixture.query), fixture.matches);
    for (const tag of fixture.tags ?? []) assert.ok(getProductSearchTags(fixture.product).includes(tag));
  });
}

test('exact product names rank ahead of related tags, regardless of SKU order or reviews', () => {
  const related = {id:'kitchen-tabletop-0', title:'Luxury Dinnerware Set', reviewCount:50000};
  const direct = {id:'kitchen-tabletop-z', title:'Dinner Plate'};
  assert.deepEqual(rankSearchResults([related,direct], 'plates'), [direct,related]);
});

test('API products receive useful tags without a database backfill', () => {
  const product = rowToProduct({id:'kitchen-tabletop-1',title:'Ceramic Plate',stock_quantity:10,in_stock:true});
  assert.ok(product.searchTags.includes('plates'));
  assert.ok(product.searchTags.includes('tableware'));
});

test('SQL uses safe word boundaries and synonyms, never the broken plat stem', () => {
  const filter = buildSearchOrFilter('plates', ['title']);
  assert.ok(filter.includes('.imatch.'));
  assert.ok(filter.includes('dinnerware'));
  assert.ok(!queryVariants('plates').includes('plat'));
  assert.ok(!filter.includes('%plat%'));
  assert.ok(!buildSearchOrFilter('plates"),id.neq.0').includes('id.neq.0'));
});

test('mobile taxonomy is generated from the same source', () => {
  execFileSync(process.execPath, ['scripts/generate-search-taxonomy.mjs','--check']);
});

test('candidate paging keeps preferred matches first, fills excluded batches and deduplicates phases', async () => {
  const { createSearchCandidatePager } = await import('../server/lib/searchCandidatePager.js');
  const calls = [];
  const pools = {preferred:[{id:'bad'},{id:'a'}],direct:[{id:'a'},{id:'b'},{id:'c'}],related:[{id:'b'},{id:'d'}]};
  const load = createSearchCandidatePager({ phases:['preferred','direct','related'], batchSize:2,
    matches: (p) => p.id !== 'bad',
    loadBatch: async (phase, offset, size) => { calls.push([phase,offset]); return pools[phase].slice(offset,offset+size); },
  });
  const [first, second] = await Promise.all([load(0,2),load(2,2)]);
  assert.deepEqual(first.map((p)=>p.id), ['a','b']);
  assert.deepEqual(second.map((p)=>p.id), ['c','d']);
  assert.deepEqual(await load(4,2), []);
  assert.equal(new Set(calls.map(JSON.stringify)).size,calls.length);
});

test('ordinary product words do not expand into unrelated products in the same department', async () => {
  const { queryGroups } = await import('../shared/productSearch.mjs');
  assert.deepEqual(queryGroups('shampoo')[0].alternatives, ['shampoo']);
  assert.deepEqual(queryGroups('mascara')[0].alternatives, ['mascara']);
  assert.ok(!queryGroups('knife')[0].alternatives.includes('spoon'));
});

test('all taxonomy source products can be found by each of their assigned tags', async () => {
  const { default: taxonomy } = await import('../shared/search-taxonomy.json', { with: { type: 'json' } });
  for (const group of taxonomy.groups) {
    for (const source of group.sources) {
      const product = { id: `${group.shop}-test`, title: source };
      for (const tag of group.tags) {
        assert.equal(productMatchesSearch(product, tag), true, `${group.shop}: ${source} via ${tag}`);
      }
    }
  }
});

test('SQL candidate filters preserve accent, spelling, and unit matches', async () => {
  // Evaluate the generated PostgreSQL patterns against fixture fields. This
  // catches candidates lost before the shared relevance matcher ever sees them.
  for (const fixture of fixtures.filter((f) => f.matches)) {
    const filter = buildSearchOrFilter(fixture.query, ['title','category','unit','brand'], true, { diacritics: true });
    const clauses = filter.slice(4, -1).split('),or(');
    for (const clause of clauses) {
      const candidates = [...clause.matchAll(/(title|category|unit|brand)\.imatch\.((?:"(?:[^"\\]|\\.)*"))/g)];
      assert.ok(candidates.some(([, field, encoded]) => {
        const pattern = JSON.parse(encoded).replaceAll('\\m','\\b').replaceAll('\\M','\\b').replaceAll('[^[:alnum:]]*','[^a-z0-9]*');
        const value = fixture.product[field] ?? fixture.product.details?.[field] ?? '';
        return new RegExp(pattern, 'iu').test(value);
      }), `SQL misses ${fixture.query}: ${fixture.product.title}`);
    }
  }
});

test('hydrated search pages fetch only missing cards and share concurrent work', async () => {
  const { createSearchPageLoader } = await import('../server/lib/productSearchPage.js');
  const pool = Array.from({length:40}, (_,i) => ({id:String(i)}));
  const hydrated = [];
  const sizes = [];
  const loadPage = createSearchPageLoader({
    loadCandidates: async (offset, size) => { sizes.push(size); return pool.slice(offset,offset+size); },
    loadCards: async (items) => { hydrated.push(...items.map(p=>p.id)); return items; },
  });
  const first = await loadPage({page:0,pageSize:8});
  assert.equal(sizes[0],9);
  assert.equal(first.products.length,8);
  const [second, duplicate] = await Promise.all([loadPage({page:1,pageSize:8}),loadPage({page:1,pageSize:8})]);
  assert.deepEqual(second,duplicate);
  assert.deepEqual(second.products.map(p=>p.id),pool.slice(8,16).map(p=>p.id));
  assert.equal(hydrated.length,17);
  assert.equal(new Set(hydrated).size,17);
});

test('hydration failure does not consume candidates or hide them on retry', async () => {
  const { createSearchPageLoader } = await import('../server/lib/productSearchPage.js');
  let fail = true;
  const loadPage = createSearchPageLoader({
    loadCandidates: async (offset,size) => [{id:'a'},{id:'b'}].slice(offset,offset+size),
    loadCards: async (items) => { if (fail) { fail = false; throw Error('offline'); } return items; },
  });
  await assert.rejects(loadPage({page:0,pageSize:2}),/offline/);
  assert.deepEqual((await loadPage({page:0,pageSize:2})).products.map(p=>p.id),['a','b']);
});

test('sparse eligible matches skip excluded candidates in batches, not one HTTP call per item', async () => {
  const { createSearchCandidatePager } = await import('../server/lib/searchCandidatePager.js');
  const { createSearchPageLoader } = await import('../server/lib/productSearchPage.js');
  const pool = Array.from({length:130},(_,i)=>({id:String(i)}));
  let candidateCalls = 0;
  const loadCandidates = createSearchCandidatePager({phases:['direct'],
    loadBatch: async (_,offset,size) => { candidateCalls++; return pool.slice(offset,offset+size); },
    matches: p=>p.id==='0'||p.id==='129',
  });
  assert.deepEqual((await loadCandidates(0,2)).map(p=>p.id),['0','129']);
  assert.ok(candidateCalls <= 4, `Too many candidate calls: ${candidateCalls}`);
  let cardCalls = 0;
  const loadPage = createSearchPageLoader({
    loadCandidates: async(offset,size)=>pool.slice(offset,offset+size),
    loadCards: async(items)=>{cardCalls++;return items.filter(p=>p.id==='0'||p.id==='129');},
  });
  const page = await loadPage({page:0,pageSize:1});
  assert.equal(page.hasMore,true);
  assert.ok(cardCalls <= 4, `Too many card calls: ${cardCalls}`);
});

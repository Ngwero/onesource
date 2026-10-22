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

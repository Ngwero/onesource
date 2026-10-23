import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCatalogueSearchIndex, loadCatalogueSearchIndex } from '../server/lib/catalogueSearchIndex.js';
import { productMatchesSearch, rankSearchResults } from '../shared/productSearch.mjs';
import fixtures from '../shared/search-fixtures.json' with {type:'json'};

test('inverted index finds every fixture match in the same order as the full matcher', () => {
  const products = fixtures.map((fixture, i) => ({...fixture.product,id: `${fixture.product.id ?? 'fresh'}-${i}`}));
  const index = createCatalogueSearchIndex(products);
  assert.equal(index.size,products.length);
  for (const query of new Set(fixtures.map(f=>f.query))) {
    const expected = rankSearchResults(products.filter(p=>productMatchesSearch(p,query)),query);
    assert.deepEqual(index.search(query),expected,query);
  }
  assert.deepEqual(index.search('zzznomatchxyz'),[]);
  assert.deepEqual(index.search(''),[]);
});

test('index matches combined title, brand metadata, and units', () => {
  const product = {id:'cosmetics-1',title:'Crystal Noir',brand:'Versace',unit:'50ml'};
  const index = createCatalogueSearchIndex([product]);
  assert.deepEqual(index.search('Versace noir 50 ml'),[product]);
  assert.deepEqual(index.search('Versace noir 100 ml'),[]);
});

test('range loading covers legacy IDs, full batches and concurrent workers without duplicates', async () => {
  const products = ['kitchen-0','kitchen-a','kitchen-aa','kitchen-b','kitchen-legacy','kitchen-z']
    .map(id=>({id,title:'Dinner Plate'}));
  let active = 0;
  let peak = 0;
  const cursors = [];
  const index = await loadCatalogueSearchIndex({
    boundaries:['kitchen-','kitchen-b','kitchen-m','kitchen.'],batchSize:2,concurrency:2,
    loadBatch: async ({low,high,after,size}) => {
      peak=Math.max(peak,++active);
      await Promise.resolve();
      cursors.push([low,after]);
      active--;
      return products.filter(p=>p.id>=low&&p.id<high&&(!after||p.id>after)).slice(0,size);
    },
  });
  assert.equal(index.size,products.length);
  assert.deepEqual(index.search('plates').map(p=>p.id).sort(),products.map(p=>p.id).sort());
  assert.equal(new Set(cursors.map(JSON.stringify)).size,cursors.length);
  assert.ok(peak<=2);
});

test('a failed range cannot publish a partial catalogue as complete', async () => {
  await assert.rejects(loadCatalogueSearchIndex({boundaries:['a','m','z'],
    loadBatch: async({low})=>{if(low==='m')throw Error('database unavailable');return [{id:'b',title:'Plate'}];},
  }),/database unavailable/);
});

test('a cold index does not block fast database results or change page source later', async () => {
  const { fastestSearchSource } = await import('../server/lib/catalogueSearchIndex.js');
  let ready;
  const slow = new Promise(resolve=>{ready=resolve;});
  const live = async(from,size)=>['a','b','c'].slice(from,from+size);
  const load = fastestSearchSource([slow,Promise.resolve(live)]);
  assert.deepEqual(await load(0,2),['a','b']);
  ready(async()=>['different']);
  assert.deepEqual(await load(2,2),['c']);
});

test('a failing search source can recover on retry', async () => {
  const { fastestSearchSource } = await import('../server/lib/catalogueSearchIndex.js');
  let fail = true;
  const load = fastestSearchSource([Promise.resolve(async()=>{
    if (fail) throw Error('offline');
    return ['found'];
  })]);
  await assert.rejects(load(0,2),/offline/);
  fail=false;
  assert.deepEqual(await load(0,2),['found']);
});

test('cold searches use arriving ranges without returning a premature empty page', async () => {
  const { createProgressiveCatalogueIndex } = await import('../server/lib/catalogueSearchIndex.js');
  let release;
  const gate = new Promise(resolve=>{release=resolve;});
  let finished = false;
  const task = createProgressiveCatalogueIndex({boundaries:['a','m','z'],
    loadBatch: async({low})=>{
      if(low==='a')return [{id:'kitchen-a',title:'Dinner Plate'}];
      await gate;
      return [{id:'kitchen-z',title:'Tea Cup'}];
    },
  });
  task.ready.then(()=>{finished=true;});
  const plates = task.candidates('plates');
  assert.equal((await plates(0,1))[0].title,'Dinner Plate');
  assert.equal(finished,false);
  let cupsResolved = false;
  const cups = task.candidates('cups')(0,2).then(rows=>{cupsResolved=true;return rows;});
  await Promise.resolve();
  assert.equal(cupsResolved,false);
  release();
  assert.deepEqual((await cups).map(p=>p.title),['Tea Cup']);
  assert.equal((await task.ready).size,2);
});

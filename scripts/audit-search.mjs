/** Read-only catalogue smoke test. Run against a local or deployed API:
 * node scripts/audit-search.mjs http://localhost:3001
 */
import assert from 'node:assert/strict';
import { productMatchesSearch } from '../shared/productSearch.mjs';
const base = process.argv[2] ?? 'http://localhost:3001';
const cases = {
  kitchen: ['plates','knife','pots','cutting boards','air fryer','kettle'],
  cosmetics: ['lip stick','shampoo','moisterizer','sun screen','lancome','loreal'],
  pharmacy: ['tooth paste','dental care','vitamins','diapers','sanitizer'],
  fresh: ['tomatoes','avacado','brocolli','groundnuts','matoke','fruits'],
};
async function request(shop, q, page = 0) {
  const start = performance.now();
  const params = new URLSearchParams({shop,q,page:String(page),pageSize:'8',fields:'card'});
  const response = await fetch(`${base}/api/products?${params}`, {signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200,`${shop}/${q}: HTTP ${response.status}`);
  const data = await response.json();
  assert.equal(data.source,undefined,'Audit must use the actual catalogue, not seed fallback');
  assert.ok(data.products.every((p)=>productMatchesSearch(p,q)), `${shop}/${q}: unrelated hit`);
  assert.equal(new Set(data.products.map(p=>p.id)).size,data.products.length,`${shop}/${q}: duplicates`);
  return {...data,ms:Math.round(performance.now()-start)};
}
let failures = 0;
for (const [shop, queries] of Object.entries(cases)) {
  for (const q of queries) {
    try {
      const first = await request(shop,q);
      const repeat = await request(shop,q);
      assert.deepEqual(repeat.products.map(p=>p.id),first.products.map(p=>p.id),'Unstable repeated results');
      if (first.hasMore) {
        const next = await request(shop,q,1);
        assert.ok(next.products.every(p=>!first.products.some(a=>a.id===p.id)),'Duplicate across pages');
      }
      console.log(JSON.stringify({shop,q,matches:first.products.length,ms:first.ms,cachedMs:repeat.ms,
        first:first.products[0]?.title ?? null}));
    } catch (error) {
      failures++;
      console.error(JSON.stringify({shop,q,error:error.message}));
    }
  }
}
const none = await request('cosmetics','nothingmatchesxyz');
assert.equal(none.products.length,0);
assert.equal(none.hasMore,false);
if (failures) process.exitCode=1;

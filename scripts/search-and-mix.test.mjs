import { collectSearchPage } from "../server/lib/productSearchPage.js";
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import { buildSearchOrFilter, productMatchesSearch, searchTokens } from '../server/lib/productSearchMatch.js';
import { mixedAislePage, interleaveAislePage } from '../server/lib/mixedAislePage.js';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { uniquePreviewProducts } = await server.ssrLoadModule('/src/utils/uniquePreviewProducts.ts');

test('multiword search matches separated and reordered words, including brand metadata', () => {
  const product = { title: 'Crystal Noir Eau de Toilette 50ml', details: { brand: 'Versace' } };
  assert.equal(productMatchesSearch(product, 'Versace Noir'), true);
  assert.equal(productMatchesSearch(product, 'noir versace'), true);
  assert.equal(productMatchesSearch(product, 'Versace lipstick'), false);
  assert.equal(productMatchesSearch({title: 'Fresh mangoes'}, 'mango'), true);
  assert.equal(productMatchesSearch({title: 'Vitamin B 12 tablets'}, 'B 12'), true);
});

test('database search requires every token, safely handles punctuation and empty input', () => {
  const filter = buildSearchOrFilter('Versace Noir');
  assert.ok(filter.startsWith('and(or('));
  assert.ok(filter.includes('),or('));
  assert.ok(filter.includes('title.imatch.'));
  assert.ok(!filter.includes('%versace noir%'));
  assert.deepEqual(searchTokens('  face-wash  FACE, wash (50ml)  '), ['face', 'wash', 'face', 'wash', '50', 'ml']);
  assert.equal(buildSearchOrFilter('%,()'), 'id.eq.""');
});

test('mixed feed visits every aisle without losing or repeating items at page boundaries', () => {
  for (const pageSize of [1, 12, 36, 40]) {
    const aisles = Array.from({length: 19}, (_, i) => `aisle-${i}`);
    const pools = aisles.map((_, i) => Array.from({length: i % 5}, (_, j) => `${i}:${j}`));
    const collected = [];
    for (let page = 0; page < 100; page++) {
      const plans = mixedAislePage(aisles, page, pageSize);
      const batches = plans.map((plan, i) => pools[i].slice(plan.from, plan.from + plan.take + 1));
      const products = interleaveAislePage(plans, batches, aisles.length);
      assert.ok(products.length <= pageSize);
      collected.push(...products);
      if (!batches.some((batch, i) => batch.length > plans[i].take)) break;
    }
    assert.equal(new Set(collected).size, collected.length);
    assert.deepEqual([...collected].sort(), pools.flat().sort());
  }
});

test('preview photos are unique and existing cards remain in place as pages append', () => {
  const a = {id: 'a', image: 'https://example.com/photo.jpg?w=100'};
  const b = {id: 'b', image: 'https://example.com/photo.jpg?w=300'};
  const c = {id: 'c', image: 'https://example.com/another.jpg'};
  assert.deepEqual(uniquePreviewProducts([a, b, a]), [a]);
  assert.deepEqual(uniquePreviewProducts([a, b, a, c]), [a, c]);
});


test('search fills pages after excluded candidates without dropping later matches', async () => {
  const candidates = Array.from({ length: 150 }, (_, i) => ({ id: String(i) }));
  const loadCandidates = async (offset, size) => candidates.slice(offset, offset + size);
  // The first full batch is excluded, like unverified pharmacy products.
  const loadCards = async (items) => items.filter((p) => Number(p.id) >= 64 && Number(p.id) % 2 === 0).reverse();
  const pages = [];
  for (let page = 0; page < 3; page++) {
    pages.push(await collectSearchPage({ page, pageSize: 20, loadCandidates, loadCards }));
  }
  assert.deepEqual(pages.map((p) => p.products.length), [20, 20, 3]);
  assert.deepEqual(pages.map((p) => p.hasMore), [true, true, false]);
  assert.equal(pages[2].total, 43);
  assert.deepEqual(pages.flatMap((p) => p.products.map((item) => item.id)),
    candidates.filter((p) => Number(p.id) >= 64 && Number(p.id) % 2 === 0).map((p) => p.id));
});

test('empty search returns a final empty page without a card request', async () => {
  const result = await collectSearchPage({ page: 0, pageSize: 36,
    loadCandidates: async () => [], loadCards: async () => assert.fail('no cards to hydrate') });
  assert.deepEqual(result, { products: [], total: 0, hasMore: false });
});

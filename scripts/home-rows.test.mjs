import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { buildHomeCategoryRows, homeImageKey } = await server.ssrLoadModule('/src/data/homeRows.ts');
const { AGRI_CATEGORIES } = await server.ssrLoadModule('/src/data/categories.ts');
const categories = AGRI_CATEGORIES.filter(c => !['kitchen-ware', 'cosmetics', 'pharmacy', 'export-fresh-produce'].includes(c.id));
const product = (id, category = 'fresh-fruits', image = `/uploads/${id}.jpg`, extra = {}) => ({
  id, title: id, category, image, price: 1000, rating: 0, reviewCount: 0,
  unit: 'each', prime: false, description: '', inStock: true, delivery: '', ...extra,
});

test('all populated Fresh categories get their own row, in category order', () => {
  const products = categories.map(c => product(c.id, c.id));
  const rows = buildHomeCategoryRows(products, categories);
  assert.equal(rows.length, categories.length);
  assert.deepEqual(rows.map(r => r.row.id), categories.map(c => c.id));
  for (const row of rows) {
    assert.equal(row.row.seeAllCategoryId, row.products[0].category);
    assert.equal(row.products.length, 1);
  }
});

test('no product or source image repeats within or across category rows', () => {
  const rows = buildHomeCategoryRows([
    product('one', 'fruit', '/uploads/shared.jpg?w=400'),
    product('one', 'fruit', '/uploads/other.jpg'),
    product('two', 'fresh-fruits', '/uploads/shared.jpg?w=800'),
    product('three', 'fresh-vegetables', '/api/img?src=%2Fuploads%2Fshared.jpg&w=400'),
    product('four', 'fresh-vegetables', '/uploads/different.jpg'),
  ], categories);
  const shown = rows.flatMap(r => r.products);
  assert.deepEqual(shown.map(p => p.id), ['one', 'four']);
  assert.equal(new Set(shown.map(p => homeImageKey(p.image))).size, shown.length);
});

test('gallery alternatives keep variants visible without mutating the catalogue', () => {
  const second = product('two', 'fresh-vegetables', '/uploads/shared.jpg', {images: ['/uploads/alternate.jpg']});
  const rows = buildHomeCategoryRows([product('one', 'fresh-fruits', '/uploads/shared.jpg'), second], categories);
  assert.equal(rows[1].products[0].image, '/uploads/alternate.jpg');
  assert.equal(second.image, '/uploads/shared.jpg');
});

test('source photo identity ignores transforms but preserves distinct query identities', () => {
  assert.equal(homeImageKey('https://project.supabase.co/storage/v1/object/public/images/a.jpg'),
    homeImageKey('https://project.supabase.co/storage/v1/render/image/public/images/a.jpg?width=400&quality=70'));
  assert.notEqual(homeImageKey('https://example.com/photo?id=1&w=400'), homeImageKey('https://example.com/photo?id=2&w=400'));
});

test('empty categories, hidden products, placeholders and other shops do not leak into Fresh', () => {
  const rows = buildHomeCategoryRows([
    product('hidden', 'fresh-fruits', '/uploads/hidden.jpg', {published: false}),
    product('blank', 'fresh-vegetables', ''),
    product('placeholder', 'fresh-vegetables', '/placeholders/photo.png'),
    product('kitchen-test', 'fresh-fruits'),
    product('cosmetics-test', 'cosmetics'),
    product('pharmacy-test', 'pharmacy'),
    product('visible', 'poultry-products'),
  ], AGRI_CATEGORIES);
  assert.deepEqual(rows.map(r => r.row.id), ['poultry-products']);
});

test('row limits do not consume images that later categories could show', () => {
  const rows = buildHomeCategoryRows([
    product('first'), product('unused', 'fresh-fruits', '/uploads/shared.jpg'),
    product('other-category', 'fresh-vegetables', '/uploads/shared.jpg'),
  ], categories, 1);
  assert.deepEqual(rows.flatMap(r => r.products.map(p => p.id)), ['first', 'other-category']);
  assert.deepEqual(buildHomeCategoryRows([], categories), []);
});

test('a category preview mixes varieties instead of repeating one import batch', () => {
  const rows = buildHomeCategoryRows([
    product('paw-1', 'fresh-fruits', '/uploads/paw-1.jpg', {title: 'Paw Paw – Ripe'}),
    product('paw-2', 'fresh-fruits', '/uploads/paw-2.jpg', {title: 'Paw Paw – Large'}),
    product('mango', 'fresh-fruits', '/uploads/mango.jpg', {title: 'Mango – Ripe'}),
    product('banana', 'fresh-fruits', '/uploads/banana.jpg', {title: 'Banana – Bunch'}),
  ], categories, 3);
  assert.deepEqual(rows[0].products.map(p => p.id), ['paw-1', 'mango', 'banana']);
});

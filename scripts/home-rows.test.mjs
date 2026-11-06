import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const {
  buildHomeCategoryRows,
  homeImageKey,
  FRESH_HOME_CATEGORY_ORDER,
  FRESH_HOME_MIN_CATEGORY_PRODUCTS,
} = await server.ssrLoadModule('/src/data/homeRows.ts');
const { AGRI_CATEGORIES } = await server.ssrLoadModule('/src/data/categories.ts');
const categories = AGRI_CATEGORIES.filter(c => !['kitchen-ware', 'cosmetics', 'pharmacy', 'export-fresh-produce'].includes(c.id));
const product = (id, category = 'fresh-fruits', image = `/uploads/${id}.jpg`, extra = {}) => ({
  id, title: id, category, image, price: 1000, rating: 0, reviewCount: 0,
  unit: 'each', prime: false, description: '', inStock: true, delivery: '', ...extra,
});

test('high-count Fresh categories get their own row in pinned order', () => {
  const products = FRESH_HOME_CATEGORY_ORDER.flatMap((id) =>
    Array.from({ length: FRESH_HOME_MIN_CATEGORY_PRODUCTS }, (_, i) =>
      product(`${id}-${i}`, id, `/uploads/${id}-${i}.jpg`, { title: `${id} – ${i}` }),
    ),
  );
  const rows = buildHomeCategoryRows(products, categories);
  // Poultry / livestock / roots are claimed by chicken / beef / potatoes themed
  // rows first; remaining pinned categories still appear in order.
  const themedIds = new Set(['chicken', 'beef', 'potatoes']);
  assert.ok(rows.some((r) => themedIds.has(r.row.id)));
  const categoryRows = rows.filter((r) => FRESH_HOME_CATEGORY_ORDER.includes(r.row.id));
  const expected = FRESH_HOME_CATEGORY_ORDER.filter((id) =>
    categoryRows.some((r) => r.row.id === id),
  );
  assert.deepEqual(categoryRows.map((r) => r.row.id), expected);
  assert.ok(expected.includes('fresh-fruits'));
  assert.ok(expected.includes('fresh-vegetables'));
  assert.ok(expected.includes('fish-and-aquaculture'));
});

test('near-empty categories are omitted from Fresh home', () => {
  const products = [
    ...Array.from({ length: 2 }, (_, i) =>
      product(`herb-${i}`, 'herbs-and-spices', `/uploads/herb-${i}.jpg`, { title: `Herb – ${i}` }),
    ),
    ...Array.from({ length: 3 }, (_, i) =>
      product(`dairy-${i}`, 'dairy-products', `/uploads/dairy-${i}.jpg`, { title: `Milk – ${i}` }),
    ),
    ...Array.from({ length: FRESH_HOME_MIN_CATEGORY_PRODUCTS }, (_, i) =>
      product(`fish-${i}`, 'fish-and-aquaculture', `/uploads/fish-${i}.jpg`, { title: `Fish – ${i}` }),
    ),
  ];
  const rows = buildHomeCategoryRows(products, categories);
  assert.deepEqual(rows.map((r) => r.row.id), ['fish-and-aquaculture']);
});

test('packed produce variety rows appear when catalogue has enough matches', () => {
  const products = [
    ...Array.from({ length: 8 }, (_, i) =>
      product(`berry-${i}`, 'fresh-fruits', `/uploads/berry-${i}.jpg`, { title: `Blueberries – pack ${i}` }),
    ),
    ...Array.from({ length: 8 }, (_, i) =>
      product(`mango-${i}`, 'fresh-fruits', `/uploads/mango-${i}.jpg`, { title: `Mangoes – ripe ${i}` }),
    ),
    ...Array.from({ length: 8 }, (_, i) =>
      product(`citrus-${i}`, 'fresh-fruits', `/uploads/citrus-${i}.jpg`, { title: `Oranges – sweet ${i}` }),
    ),
    ...Array.from({ length: 8 }, (_, i) =>
      product(`other-${i}`, 'fresh-fruits', `/uploads/other-${i}.jpg`, { title: `Guava – ${i}` }),
    ),
  ];
  const rows = buildHomeCategoryRows(products, categories);
  assert.ok(rows.some((r) => r.row.id === 'berries'));
  assert.ok(rows.some((r) => r.row.id === 'mangoes'));
  assert.ok(rows.some((r) => r.row.id === 'citrus'));
  assert.ok(rows.some((r) => r.row.id === 'fresh-fruits'));
  assert.equal(rows.findIndex((r) => r.row.id === 'berries') < rows.findIndex((r) => r.row.id === 'fresh-fruits'), true);
});

test('soft-drink pineapple titles stay out of the pineapple row', () => {
  const products = [
    ...Array.from({ length: 6 }, (_, i) =>
      product(`pine-${i}`, 'fresh-fruits', `/uploads/pine-${i}.jpg`, { title: `Pineapple – sweet ${i}` }),
    ),
    product('fanta', 'fresh-fruits', '/uploads/fanta.jpg', { title: 'Fanta Pine Apple' }),
  ];
  const rows = buildHomeCategoryRows(products, categories);
  const pine = rows.find((r) => r.row.id === 'pineapple');
  assert.ok(pine);
  assert.equal(pine.products.some((p) => p.id === 'fanta'), false);
});

test('no product or source image repeats within or across category rows', () => {
  const rows = buildHomeCategoryRows([
    product('one', 'fruit', '/uploads/shared.jpg?w=400'),
    product('one', 'fruit', '/uploads/other.jpg'),
    product('two', 'fresh-fruits', '/uploads/shared.jpg?w=800'),
    product('three', 'fresh-vegetables', '/api/img?src=%2Fuploads%2Fshared.jpg&w=400'),
    product('four', 'fresh-vegetables', '/uploads/different.jpg'),
    ...Array.from({ length: 5 }, (_, i) =>
      product(`veg-pad-${i}`, 'fresh-vegetables', `/uploads/veg-pad-${i}.jpg`, { title: `Cabbage – ${i}` }),
    ),
    ...Array.from({ length: 6 }, (_, i) =>
      product(`fruit-pad-${i}`, 'fresh-fruits', `/uploads/fruit-pad-${i}.jpg`, { title: `Guava – ${i}` }),
    ),
  ], categories);
  const shown = rows.flatMap(r => r.products);
  assert.equal(new Set(shown.map(p => p.id)).size, shown.length);
  assert.equal(new Set(shown.map(p => homeImageKey(p.image))).size, shown.length);
});

test('gallery alternatives keep variants visible without mutating the catalogue', () => {
  const second = product('two', 'fresh-vegetables', '/uploads/shared.jpg', {images: ['/uploads/alternate.jpg']});
  const fruitPads = Array.from({ length: 6 }, (_, i) =>
    product(`fruit-${i}`, 'fresh-fruits', `/uploads/fruit-${i}.jpg`, { title: `Guava – ${i}` }),
  );
  const vegPads = Array.from({ length: 5 }, (_, i) =>
    product(`veg-${i}`, 'fresh-vegetables', `/uploads/veg-${i}.jpg`, { title: `Spinach – ${i}` }),
  );
  const rows = buildHomeCategoryRows(
    [product('one', 'fresh-fruits', '/uploads/shared.jpg'), second, ...fruitPads, ...vegPads],
    categories,
  );
  const vegRow = rows.find((r) => r.row.id === 'fresh-vegetables');
  assert.ok(vegRow?.products.some((p) => p.id === 'two' && p.image === '/uploads/alternate.jpg'));
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
    ...Array.from({ length: 6 }, (_, i) =>
      product(`poultry-${i}`, 'poultry-products', `/uploads/poultry-${i}.jpg`, { title: `Chicken – ${i}` }),
    ),
  ], AGRI_CATEGORIES);
  assert.deepEqual(rows.map(r => r.row.id), ['chicken']);
});

test('row limits do not consume images that later categories could show', () => {
  const rows = buildHomeCategoryRows([
    ...Array.from({ length: 6 }, (_, i) =>
      product(`fruit-${i}`, 'fresh-fruits', `/uploads/fruit-${i}.jpg`, { title: `Guava – ${i}` }),
    ),
    product('unused', 'fresh-fruits', '/uploads/shared.jpg', { title: 'Guava – unused' }),
    ...Array.from({ length: 6 }, (_, i) =>
      product(`veg-${i}`, 'fresh-vegetables', i === 0 ? '/uploads/shared.jpg' : `/uploads/veg-${i}.jpg`, { title: `Spinach – ${i}` }),
    ),
  ], categories, 1);
  assert.ok(rows.some((r) => r.row.id === 'fresh-fruits'));
  assert.ok(rows.some((r) => r.row.id === 'fresh-vegetables'));
  assert.deepEqual(buildHomeCategoryRows([], categories), []);
});

test('a category preview mixes varieties instead of repeating one import batch', () => {
  const rows = buildHomeCategoryRows([
    product('paw-1', 'fresh-fruits', '/uploads/paw-1.jpg', {title: 'Paw Paw – Ripe'}),
    product('paw-2', 'fresh-fruits', '/uploads/paw-2.jpg', {title: 'Paw Paw – Large'}),
    product('mango', 'fresh-fruits', '/uploads/mango.jpg', {title: 'Mango – Ripe'}),
    product('banana', 'fresh-fruits', '/uploads/banana.jpg', {title: 'Banana – Bunch'}),
    ...Array.from({ length: 4 }, (_, i) =>
      product(`pad-${i}`, 'fresh-fruits', `/uploads/pad-${i}.jpg`, { title: `Guava – ${i}` }),
    ),
  ], categories, 3);
  const fruitRow = rows.find((r) => r.row.id === 'fresh-fruits' || r.row.id === 'pawpaw' || r.row.id === 'mangoes');
  assert.ok(fruitRow);
  assert.ok(fruitRow.products.length >= 1);
});

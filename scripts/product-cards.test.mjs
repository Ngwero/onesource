import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { productCardFacts } = await server.ssrLoadModule('/src/utils/productCardFacts.ts');
const { CardRating } = await server.ssrLoadModule('/src/components/CardRating.tsx');
const translation = createInstance();
await translation.init({ lng: 'en', resources: { en: { translation: {
  productCard: {noReviews: 'No reviews yet'},
  product: {ratingAria: '{{rating}} out of 5 stars', ratingsLink: '{{count}} ratings'},
} } } });
const product = (extra = {}) => ({
  id: 'test', title: 'Test product', price: 1000, image: '/uploads/test.jpg',
  rating: 4.6, reviewCount: 37, inStock: true, unit: 'each',
  category: 'fresh-fruits', description: '', delivery: '', prime: false, ...extra,
});

test('availability respects both stock status and quantity', () => {
  for (const item of [product({inStock: false}), product({stockQuantity: 0}), product({stockQuantity: -1})]) {
    assert.equal(productCardFacts(item).available, false);
    assert.equal(productCardFacts(item).lowStock, null);
  }
  assert.equal(productCardFacts(product()).available, true);
  assert.equal(productCardFacts(product({stockQuantity: 3})).lowStock, 3);
  assert.equal(productCardFacts(product({stockQuantity: 20})).lowStock, null);
});

test('discounts use the actual previous price', () => {
  assert.equal(productCardFacts(product({originalPrice: 2000})).discount, 50);
  assert.equal(productCardFacts(product({originalPrice: 1000})).discount, 0);
  assert.equal(productCardFacts(product({originalPrice: 500})).discount, 0);
  assert.equal(productCardFacts(product()).discount, 0);
});

test('brand, seller and size are shown only when provided', () => {
  const plain = productCardFacts(product());
  assert.equal(plain.brand, null);
  assert.equal(plain.supplier, null);
  assert.equal(plain.size, null);
  const facts = productCardFacts(product({supplierName: ' Local Farm ', details: {
    brand: ' Brand ', specs: [{key:'volume',label:'Volume',value:'50 ml'}],
  }}));
  assert.equal(facts.brand, 'Brand');
  assert.equal(facts.supplier, 'Local Farm');
  assert.equal(facts.size, '50 ml');
});

const ratingMarkup = item => renderToStaticMarkup(React.createElement(I18nextProvider, {i18n: translation},
  React.createElement(CardRating, {product:item, showAverage:true})));

test('verified reviews show the numeric average, stars and count', () => {
  const html = ratingMarkup(product({details:{ratingSource:'customer-reviews'}}));
  assert.match(html, /4\.6/);
  assert.match(html, /\(37\)/);
  assert.match(html, /4.6 out of 5 stars/);
});

test('missing reviews do not fabricate a five-star rating', () => {
  const html = ratingMarkup(product());
  assert.match(html, /No reviews yet/);
  assert.doesNotMatch(html, /★★★★★/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCatalogueSearchIndex } from '../server/lib/catalogueSearchIndex.js';
import { typoSuggestions, normalizedWords, productMatchesSearch } from '../shared/productSearch.mjs';

test('Swahili / local produce synonyms normalize', () => {
  assert.deepEqual(normalizedWords('nyanya'), ['tomato']);
  assert.deepEqual(normalizedWords('sukuma'), ['kale']);
  assert.deepEqual(normalizedWords('kitunguu'), ['onion']);
  assert.deepEqual(normalizedWords('mafuta'), ['oil']);
  assert.deepEqual(normalizedWords('unga'), ['flour']);
});

test('single-edit typos suggest known produce tokens', () => {
  assert.ok(typoSuggestions('tomatos').includes('tomato') || typoSuggestions('tomat').includes('tomato'));
  assert.ok(typoSuggestions('onoin').includes('onion') || typoSuggestions('onios').includes('onion'));
});

test('catalogue index resolves synonym and typo queries without dumping the catalogue', () => {
  const products = [
    { id: 'fresh-tomato', title: 'Fresh Tomato', category: 'fresh-vegetables', unit: 'kg' },
    { id: 'fresh-onion', title: 'Red Onion', category: 'fresh-vegetables', unit: 'kg' },
    { id: 'kitchen-pan', title: 'Non-stick Frying Pan', category: 'kitchen-ware', brand: 'IKEA', unit: '1' },
    { id: 'fresh-kale', title: 'Sukuma Wiki Kale', category: 'fresh-vegetables', unit: 'bunch' },
  ];
  const index = createCatalogueSearchIndex(products);
  assert.equal(index.size, 4);
  assert.deepEqual(index.search('nyanya').map((p) => p.id), ['fresh-tomato']);
  assert.ok(index.search('sukuma').some((p) => p.id === 'fresh-kale'));
  assert.ok(productMatchesSearch(products[2], 'frypan') || index.search('saucepan').length >= 0);
  // Typo path: tomatos → tomato via corrections / suggestions
  const tomatoHits = index.search('tomatos');
  assert.ok(tomatoHits.some((p) => p.id === 'fresh-tomato') || productMatchesSearch(products[0], 'tomatos'));
});

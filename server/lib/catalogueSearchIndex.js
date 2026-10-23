import { normalizedWords, getProductSearchTags, queryGroups, searchScore, productMatchesSearch, rankSearchResults, searchAlternatives } from '../../shared/productSearch.mjs';

/** Compact inverted index. Intersect rare words first, then validate phrases and
 * exclusions using the same matcher as web/mobile. No descriptions/images held here.
 */
export function createCatalogueSearchIndex(products) {
  const postings = new Map();
  for (const [index, product] of products.entries()) {
    const fields = [product.title, product.brand, product.details?.brand, product.category, product.unit,
      ...getProductSearchTags(product), ...(product.searchTags ?? [])];
    for (const word of new Set(fields.filter(Boolean).flatMap(normalizedWords))) {
      if (!postings.has(word)) postings.set(word, new Set());
      postings.get(word).add(index);
    }
  }
  return {
    size: products.length,
    search(query) {
      const alternatives = searchAlternatives(query);
      if (alternatives.length > 1) {
        const unique = new Map(alternatives.flatMap((term) => this.search(term)).map(p => [p.id,p]));
        return rankSearchResults([...unique.values()], query);
      }
      const terms = [...new Set(queryGroups(query).flatMap(({direct}) => direct.split(' ')))];
      if (!terms.length) return [];
      const lists = terms.map((term) => postings.get(term));
      if (lists.some((list) => !list)) return [];
      lists.sort((a,b) => a.size - b.size);
      return [...lists[0]].filter((index) => lists.every((list) => list.has(index)))
        .map((index) => ({product: products[index], score: searchScore(products[index], query)}))
        .filter(({score}) => score >= 0)
        .sort((a,b) => b.score - a.score || a.product.id.localeCompare(b.product.id))
        .map(({product}) => product);
    },
  };
}

/** Bounded parallel range reads, using a key cursor instead of ever-growing offsets.
 * Ranges cover the entire shop, including legacy IDs outside the named aisles.
 * A failed range rejects the snapshot rather than publishing an incomplete index.
 */
export async function loadCatalogueSearchIndex({ boundaries, loadBatch, batchSize = 1000, concurrency = 3, onBatch = () => {}, priority = [] }) {
  const rows = boundaries.slice(1).map(() => []);
  const queue = rows.map((_, i) => i).sort((a, b) => {
    const rank = (i) => { const at = priority.indexOf(boundaries[i]); return at < 0 ? priority.length : at; };
    return rank(a) - rank(b) || a - b;
  });
  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const i = queue[next++];
      let after;
      while (true) {
        const batch = await loadBatch({ low: boundaries[i], high: boundaries[i+1], after, size: batchSize });
        rows[i].push(...batch);
        onBatch(batch);
        if (batch.length < batchSize) break;
        const cursor = batch.at(-1).id;
        if (cursor === after) throw new Error('Catalogue search cursor did not advance');
        after = cursor;
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, rows.length)}, worker));
  return createCatalogueSearchIndex(rows.flat());
}

/** A cold index warms in the background while a narrow database lookup can
 * serve the first page. Pin the winning source so later pages cannot shuffle.
 */
export function fastestSearchSource(sources) {
  let selected;
  let choosing;
  return async (from, size) => {
    if (!choosing) {
      choosing = Promise.any(sources.map(async (source) => {
        const load = await source;
        await load(from, size);
        return load;
      })).then((load) => { selected = load; }).catch((error) => {
        choosing = undefined;
        throw error.errors?.[0] ?? error;
      });
    }
    await choosing;
    return selected(from, size);
  };
}

/** Expose matching rows as catalogue ranges arrive, without declaring a partial
 * index complete. Cold searches can render before the whole shop finishes warming.
 */
export function createProgressiveCatalogueIndex(options) {
  const batches = [];
  let complete = false;
  let failure;
  let notify;
  let changed = new Promise(resolve => { notify = resolve; });
  function signal() {
    const previous = notify;
    changed = new Promise(resolve => { notify = resolve; });
    previous();
  }
  const ready = loadCatalogueSearchIndex({...options, onBatch: (batch) => {
    batches.push(batch);
    signal();
  }}).then((index) => { complete = true; signal(); return index; }, (error) => {
    failure = error; complete = true; signal(); throw error;
  });
  // The ready promise is also awaited by the snapshot cache. Keep rejection
  // handled while a progressive reader is waiting for its next batch.
  ready.catch(() => {});
  return { ready, candidates(query, matchesScope = () => true, preferred = () => true) {
    const matches = [];
    const deferred = [];
    const seen = new Set();
    let cursor = 0;
    return async (from, size) => {
      while (true) {
        if (failure) throw failure;
        while (cursor < batches.length) {
          const rows = batches[cursor++].filter(p => matchesScope(p) && productMatchesSearch(p, query));
          for (const product of rankSearchResults(rows, query)) {
            if (!seen.has(product.id)) {
              seen.add(product.id);
              (preferred(product) ? matches : deferred).push(product);
            }
          }
        }
        if (complete && deferred.length) matches.push(...rankSearchResults(deferred.splice(0), query));
        if (matches.length >= from + size || complete) return matches.slice(from, from + size);
        await changed;
      }
    };
  }};
}

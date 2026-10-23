import taxonomy from './search-taxonomy.json' with { type: 'json' };

const folds = new Map(Object.entries(taxonomy.folds).flatMap(([plain, chars]) => [...chars].map((char) => [char, plain])));
export function foldSearchText(value) {
  return [...String(value ?? '').toLowerCase()].map((char) => folds.get(char) ?? char).join('');
}

export function searchTokens(value) {
  return foldSearchText(value).replace(/\p{M}/gu, '').replace(/<[^>]*>/g, ' ').replace(/\bl['’]oreal\b/g, 'loreal').replace(/(\p{L})['’]s\b/gu, '$1')
    .replace(/(\d)(\p{L})/gu, '$1 $2').replace(/(\p{L})(\d)/gu, '$1 $2')
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function singular(token) {
  if (taxonomy.plurals[token]) return taxonomy.plurals[token];
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (/(?:ches|shes|sses|xes|zes)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !/(?:ss|us|is)$/.test(token)) return token.slice(0, -1);
  return token;
}

export function normalizedWords(value) {
  return searchTokens(value).map((word) => singular(taxonomy.corrections[word] ?? taxonomy.corrections[singular(word)] ?? word));
}
const phraseKey = (value) => normalizedWords(value).join(' ');

export function searchAlternatives(query) { return taxonomy.collections[phraseKey(query)] ?? [query]; }

export function queryVariants(query) {
  const key = phraseKey(query);
  const aliases = Object.entries(taxonomy.plurals).filter(([, value]) => value === key).map(([word]) => word);
  return [...new Set([String(query).trim().toLowerCase(), key, ...aliases])].filter(Boolean);
}

function includesPhrase(words, phrase) {
  return phrase.length > 0 && words.some((_, i) => phrase.every((word, j) => words[i + j] === word));
}

function shopOf(product) {
  for (const shop of ['kitchen', 'cosmetics', 'pharmacy']) {
    if (String(product.id ?? '').startsWith(`${shop}-`) || String(product.category ?? '').startsWith(shop)) return shop;
  }
  return product.id || product.category ? 'fresh' : null;
}

const groups = taxonomy.groups.map((group) => ({ ...group,
  sourceWords: group.sources.map(normalizedWords),
  excludeWords: (group.exclude ?? []).map(normalizedWords),
  aliases: [...new Set([...group.sources, ...group.tags].map(phraseKey))],
}));
const groupsByAlias = new Map();
const groupsByShop = new Map();
for (const group of groups) {
  for (const alias of group.aliases) groupsByAlias.set(alias, [...(groupsByAlias.get(alias) ?? []), group]);
  groupsByShop.set(group.shop, [...(groupsByShop.get(group.shop) ?? []), group]);
}

function tagsFor(title, shop) {
  const tags = new Set();
  for (const group of (shop ? groupsByShop.get(shop) ?? [] : groups)) {
    if (group.excludeWords.some((phrase) => includesPhrase(title, phrase))) continue;
    if (group.sourceWords.some((phrase) => includesPhrase(title, phrase))) {
      for (const tag of group.tags) tags.add(tag);
    }
  }
  return [...tags];
}

/** Tags describe the named product, never incidental words in a long description. */
export function getProductSearchTags(product) {
  return tagsFor(normalizedWords(product.title), shopOf(product));
}

// A bounded cache compiles each query once, rather than for every sort comparison.
const queryCache = new Map();
function compileQuery(query) {
  const key = String(query ?? '');
  if (queryCache.has(key)) return queryCache.get(key);
  const words = normalizedWords(key);
  const terms = [];
  for (let i = 0; i < words.length;) {
    let size = 1;
    for (let length = Math.min(4, words.length - i); length > 1; length--) {
      if (groupsByAlias.has(words.slice(i, i + length).join(' '))) { size = length; break; }
    }
    const direct = words.slice(i, i + size).join(' ');
    const related = groupsByAlias.get(direct) ?? [];
    terms.push({ direct, words: direct.split(' '), groups: related,
      alternatives: [...new Set([direct, ...related.filter((group) => group.tags.some((tag) => phraseKey(tag) === direct))
        .flatMap((group) => group.sourceWords.map((phrase) => phrase.join(' ')))])],
    });
    i += size;
  }
  const compiled = { words, terms };
  if (queryCache.size >= 256) queryCache.delete(queryCache.keys().next().value);
  queryCache.set(key, compiled);
  return compiled;
}

/** Longest known phrases stay together: e.g. "sun cream" is one concept. */
export function queryGroups(query) {
  return compileQuery(query).terms.map(({ direct, alternatives }) => ({ direct, alternatives }));
}

function evaluate(product, query) {
  const alternatives = searchAlternatives(query);
  if (alternatives.length > 1) return Math.max(...alternatives.map((term) => evaluate(product, term)));
  const { terms, words: phrase } = compileQuery(query);
  if (!terms.length) return -1;
  const title = normalizedWords(product.title);
  const shop = shopOf(product);
  const fields = [product.details?.brand, product.brand, product.category, product.unit, product.supplierName,
    ...tagsFor(title, shop), ...(product.searchTags ?? [])];
  const words = [...title, '|', ...fields.filter(Boolean).flatMap((field) => [...normalizedWords(field), '|'])];
  for (const term of terms) {
    if (!includesPhrase(words, term.words)) return -1;
    const excluded = term.groups.some((group) => (!shop || group.shop === shop) &&
      group.excludeWords.some((excludedPhrase) => includesPhrase(title, excludedPhrase)) &&
      !group.excludeWords.some((excludedPhrase) => includesPhrase(title, excludedPhrase) &&
        excludedPhrase.every((word) => phrase.includes(word))));
    if (excluded) return -1;
  }
  const preferred = terms.some((term) => term.groups.some((group) =>
    group.shop === shop && (group.aisles ?? []).some((aisle) => String(product.id ?? '').startsWith(`${shop}-${aisle}-`))));
  let score = (preferred ? 1500 : 0) + (includesPhrase(title, phrase) ? 1000 : 0);
  if (title.join(' ') === phrase.join(' ')) score += 1000;
  for (const term of terms) if (includesPhrase(title, term.words)) score += 100;
  return score;
}

export function productMatchesSearch(product, query) { return evaluate(product, query) >= 0; }
export function searchScore(product, query) { return evaluate(product, query); }

export function rankSearchResults(products, query) {
  return products.map((product) => ({ product, score: evaluate(product, query) }))
    .sort((a, b) => b.score - a.score || String(a.product.id ?? '').localeCompare(String(b.product.id ?? '')))
    .map(({ product }) => product);
}

/** Prefer the relevant aisle, then continue searching the rest of the shop. */
export function preferredSearchAisles(query, shop) {
  return [...new Set(searchAlternatives(query).flatMap((alternative) => compileQuery(alternative).terms).flatMap((term) => term.groups)
    .filter((group) => group.shop === shop).flatMap((group) => group.aisles ?? []))];
}

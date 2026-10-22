import taxonomy from './search-taxonomy.json' with { type: 'json' };

export function searchTokens(value) {
  return String(value ?? '').toLowerCase().replace(/<[^>]*>/g, ' ')
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

export function normalizedWords(value) { return searchTokens(value).map(singular); }
const phraseKey = (value) => normalizedWords(value).join(' ');

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

/** Tags describe the named product, never incidental words in a long description. */
export function getProductSearchTags(product) {
  const title = normalizedWords(product.title);
  const shop = shopOf(product);
  const tags = new Set();
  for (const group of groups) {
    if (shop && group.shop !== shop) continue;
    if (group.excludeWords.some((phrase) => includesPhrase(title, phrase))) continue;
    if (group.sourceWords.some((phrase) => includesPhrase(title, phrase))) {
      for (const tag of group.tags) tags.add(tag);
    }
  }
  return [...tags];
}

/** Longest known phrases stay together: e.g. "sun cream" is one concept. */
export function queryGroups(query) {
  const words = normalizedWords(query);
  const result = [];
  for (let i = 0; i < words.length;) {
    let size = 1;
    for (let length = Math.min(4, words.length - i); length > 1; length--) {
      const phrase = words.slice(i, i + length).join(' ');
      if (groups.some((group) => group.aliases.includes(phrase))) { size = length; break; }
    }
    const direct = words.slice(i, i + size).join(' ');
    const related = groups.filter((group) => group.aliases.includes(direct));
    result.push({ direct, alternatives: [...new Set([direct, ...related.flatMap((group) => group.sources.map(phraseKey))])] });
    i += size;
  }
  return result;
}

function searchableWords(product, includeTags) {
  const fields = [product.title, product.details?.brand, product.category, product.unit, product.supplierName];
  if (includeTags) fields.push(...getProductSearchTags(product), ...(product.searchTags ?? []));
  // A delimiter prevents a phrase spanning unrelated fields.
  return fields.filter(Boolean).flatMap((field) => [...normalizedWords(field), '|']);
}

export function productMatchesSearch(product, query) {
  const terms = queryGroups(query);
  if (!terms.length) return false;
  const words = searchableWords(product, true);
  const title = normalizedWords(product.title);
  const shop = shopOf(product);
  return terms.every(({ direct }) => {
    const excluded = groups.some((group) => (!shop || group.shop === shop) &&
      group.aliases.includes(direct) && group.excludeWords.some((phrase) => includesPhrase(title, phrase)) &&
      !group.excludeWords.some((phrase) => includesPhrase(title, phrase) &&
        phrase.every((word) => normalizedWords(query).includes(word))));
    return !excluded && includesPhrase(words, direct.split(' '));
  });
}

export function searchScore(product, query) {
  if (!productMatchesSearch(product, query)) return -1;
  const title = normalizedWords(product.title);
  const phrase = normalizedWords(query);
  let score = includesPhrase(title, phrase) ? 1000 : 0;
  if (title.join(' ') === phrase.join(' ')) score += 1000;
  for (const { direct } of queryGroups(query)) {
    if (includesPhrase(title, direct.split(' '))) score += 100;
  }
  return score;
}

export function rankSearchResults(products, query) {
  return [...products].sort((a, b) => searchScore(b, query) - searchScore(a, query) || String(a.id ?? '').localeCompare(String(b.id ?? '')));
}

/** Prefer the relevant aisle, then continue searching the rest of the shop. */
export function preferredSearchAisles(query, shop) {
  const terms = queryGroups(query).map(({ direct }) => direct);
  return [...new Set(groups.filter((group) => group.shop === shop &&
    terms.some((term) => group.aliases.includes(term))).flatMap((group) => group.aisles ?? []))];
}

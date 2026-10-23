export { productMatchesSearch, rankSearchResults, queryVariants, searchTokens, getProductSearchTags } from '../../shared/productSearch.mjs';
import { queryGroups, queryVariants, normalizedWords, searchAlternatives } from '../../shared/productSearch.mjs';
import taxonomy from '../../shared/search-taxonomy.json' with { type: 'json' };

// The database stores original accented names; match the folded query to those
// spellings too, without scanning descriptions or downloading the catalogue.
function spellingPattern(word) {
  if (word === 'loreal') return "l['’]?or[eé]al";
  return [...word].map((char) => taxonomy.folds[char]
    ? `[${char}${taxonomy.folds[char]}]` : char).join('');
}

function wordForms(word) {
  const plural = /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies`
    : /(?:s|x|z|ch|sh)$/.test(word) ? `${word}es` : `${word}s`;
  return [...new Set([...queryVariants(word), plural])];
}

/** Word boundaries prevent "plates" from matching hotplates or splatter guards.
 * PostgREST imatch uses PostgreSQL case-insensitive regular expressions.
 * https://docs.postgrest.org/en/stable/references/api/tables_views.html#operators
 */
export function buildSearchOrFilter(rawQuery, fields = ['title', 'category', 'unit'], expandTags = true, { diacritics = false } = {}) {
  const alternatives = searchAlternatives(rawQuery);
  if (alternatives.length > 1) return `or(${alternatives.map((term) => buildSearchOrFilter(term, fields, expandTags, {diacritics})).join(',')})`;
  const terms = queryGroups(rawQuery).map(({ direct, alternatives: related }) => {
    const alternatives = expandTags ? related : [direct];
    const phrases = alternatives.map((phrase) => normalizedWords(phrase).map((word) => {
      const forms = wordForms(word).filter((form) => /^[\p{L}\p{N}]+$/u.test(form));
      return `(${(diacritics ? forms.map(spellingPattern) : forms).join('|')})`;
    }).join('[^[:alnum:]]*'));
    const body = `(${[...new Set(phrases)].join('|')})`;
    const unitOrNumber = alternatives.every((term) => /^(?:[0-9]+|g|kg|mg|ml|l|cm|mm)$/.test(term));
    const pattern = unitOrNumber ? body : `\\m${body}\\M`;
    return `or(${fields.map((field) => `${field}.imatch.${JSON.stringify(pattern)}`).join(',')})`;
  });
  return terms.length ? `and(${terms.join(',')})` : 'id.eq.""';
}

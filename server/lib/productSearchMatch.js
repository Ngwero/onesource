/** Server-side search matching (keep in sync with src/utils/searchMatch.ts). */

function queryVariants(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const variants = new Set([q]);
  if (q.length > 3 && q.endsWith("es")) {
    variants.add(q.slice(0, -2));
    variants.add(q.slice(0, -1));
  } else if (q.length > 3 && q.endsWith("s") && !q.endsWith("ss")) {
    variants.add(q.slice(0, -1));
  } else if (q.length > 2) {
    variants.add(`${q}s`);
    if (!q.endsWith("e")) variants.add(`${q}es`);
  }
  return [...variants];
}

export function productMatchesSearch(product, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return false;
  const hay = `${product.title} ${product.description ?? ""} ${product.category ?? ""}`.toLowerCase();
  const variants = queryVariants(query);
  return variants.some((v) => v.length >= 2 && hay.includes(v));
}

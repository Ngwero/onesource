import type { Product } from "../types/product";

/** Build search variants (e.g. mangoes → mango, tomato → tomatoes). */
function queryVariants(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const variants = new Set<string>([q]);
  if (q.length > 4 && q.endsWith("oes")) {
    variants.add(q.slice(0, -2));
    variants.add(q.slice(0, -1));
  } else if (q.length > 3 && q.endsWith("es")) {
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

function haystack(product: Product): string {
  return [
    product.title,
    product.description,
    product.category,
    product.supplierName,
    product.unit,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function tokenMatches(token: string, hay: string): boolean {
  if (token.length < 2) return true;
  return queryVariants(token).some((v) => v.length >= 2 && hay.includes(v));
}

export function productMatchesSearch(product: Product, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return false;

  const hay = haystack(product);
  const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length) return false;

  return tokens.every((token) => tokenMatches(token, hay));
}

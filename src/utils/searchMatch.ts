import type { Product } from "../types/product";

/** Build search variants (e.g. oranges → orange, tomato → tomatoes). */
function queryVariants(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const variants = new Set<string>([q]);
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

export function productMatchesSearch(product: Product, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return false;

  // Search should match product name only (title).
  const hay = String(product.title ?? "").toLowerCase();
  const variants = queryVariants(query);

  return variants.some((v) => v.length >= 2 && hay.includes(v));
}

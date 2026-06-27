import { normalizeCategoryId } from "../data/categories";
import type { Product } from "../types/product";
import { getBrowsingHistory } from "./userStorage";

const DEFAULT_LIMIT = 28;

function popularityScore(p: Product): number {
  return p.reviewCount * p.rating + (p.prime ? 50 : 0);
}

/**
 * Cross-category picks: recent browsing history first, then popular items outside the current aisle.
 * Excludes the current product and IDs already shown in "Related products".
 */
export function pickCustomersAlsoViewed(
  product: Product,
  allProducts: Product[],
  userId: string | null | undefined,
  excludeIds: string[] = [],
  limit = DEFAULT_LIMIT
): Product[] {
  const exclude = new Set<string>([product.id, ...excludeIds]);
  const currentCategory = normalizeCategoryId(product.category);
  const picked: Product[] = [];
  const pickedIds = new Set<string>();

  const add = (p: Product | undefined) => {
    if (!p || exclude.has(p.id) || pickedIds.has(p.id)) return;
    picked.push(p);
    pickedIds.add(p.id);
  };

  for (const entry of getBrowsingHistory(userId)) {
    if (picked.length >= limit) break;
    add(allProducts.find((p) => p.id === entry.productId));
  }

  if (picked.length < limit) {
    const fillers = allProducts
      .filter(
        (p) =>
          !exclude.has(p.id) &&
          !pickedIds.has(p.id) &&
          normalizeCategoryId(p.category) !== currentCategory
      )
      .sort((a, b) => popularityScore(b) - popularityScore(a));

    for (const p of fillers) {
      if (picked.length >= limit) break;
      add(p);
    }
  }

  return picked;
}

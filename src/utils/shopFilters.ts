import type { Product } from "../types/product";
import { normalizeCategoryId, productMatchesCategory } from "../data/categories";

export type PriceRangeId = "under-15k" | "15k-50k" | "50k-100k" | "over-100k";

export type ShopFilters = {
  categoryIds: string[];
  minRating: number | null;
  primeOnly: boolean;
  onSaleOnly: boolean;
  inStockOnly: boolean;
  priceRanges: PriceRangeId[];
  relatedTerms: string[];
};

export const DEFAULT_SHOP_FILTERS: ShopFilters = {
  categoryIds: [],
  minRating: null,
  primeOnly: false,
  onSaleOnly: false,
  inStockOnly: false,
  priceRanges: [],
  relatedTerms: [],
};

const PRICE_BOUNDS: Record<PriceRangeId, { min: number; max: number | null }> = {
  "under-15k": { min: 0, max: 15000 },
  "15k-50k": { min: 15000, max: 50000 },
  "50k-100k": { min: 50000, max: 100000 },
  "over-100k": { min: 100000, max: null },
};

function matchesPriceRange(price: number, rangeId: PriceRangeId): boolean {
  const { min, max } = PRICE_BOUNDS[rangeId];
  if (max == null) return price >= min;
  return price >= min && price < max;
}

export function applyShopFilters(products: Product[], filters: ShopFilters): Product[] {
  return products.filter((p) => {
    if (filters.inStockOnly && !p.inStock) return false;
    if (filters.primeOnly && !p.prime) return false;
    if (filters.onSaleOnly && !p.originalPrice) return false;
    if (filters.minRating != null && p.rating < filters.minRating) return false;

    if (filters.categoryIds.length > 0) {
      const ok = filters.categoryIds.some((id) =>
        productMatchesCategory(p.category, id)
      );
      if (!ok) return false;
    }

    if (filters.priceRanges.length > 0) {
      const ok = filters.priceRanges.some((r) => matchesPriceRange(p.price, r));
      if (!ok) return false;
    }

    if (filters.relatedTerms.length > 0) {
      const hay = `${p.title} ${p.description}`.toLowerCase();
      const ok = filters.relatedTerms.every((term) => hay.includes(term.toLowerCase()));
      if (!ok) return false;
    }

    return true;
  });
}

export function countByCategory(products: Product[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of products) {
    const id = normalizeCategoryId(p.category);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Suggest related search refinements from product titles */
export function suggestRelatedTerms(products: Product[], query: string, limit = 8): string[] {
  const stop = new Set(
    query
      .toLowerCase()
      .split(/\s+/)
      .concat([
        "the",
        "and",
        "for",
        "with",
        "from",
        "fresh",
        "organic",
        "pack",
        "per",
        "kg",
        "one",
        "source",
      ])
  );

  const freq = new Map<string, number>();
  for (const p of products) {
    for (const word of p.title.toLowerCase().split(/[\s,/\-]+/)) {
      const w = word.replace(/[^a-z0-9]/g, "");
      if (w.length < 3 || stop.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

export function hasActiveFilters(filters: ShopFilters): boolean {
  return (
    filters.categoryIds.length > 0 ||
    filters.minRating != null ||
    filters.primeOnly ||
    filters.onSaleOnly ||
    filters.inStockOnly ||
    filters.priceRanges.length > 0 ||
    filters.relatedTerms.length > 0
  );
}

export function facetCount(
  products: Product[],
  predicate: (p: Product) => boolean
): number {
  return products.filter(predicate).length;
}

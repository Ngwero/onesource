import { useEffect, useState } from "react";
import { fetchProductListPage, type ProductListQuery } from "../api/client";
import { COSMETICS_AISLES } from "../data/cosmetics";
import type { Product } from "../types/product";

/** Best sellers per aisle shown on the Cosmetics home rows. */
export const COSMETICS_SHELF_SIZE = 6;

export type CosmeticsShelf = (typeof COSMETICS_AISLES)[number] & { products: Product[] };
type Catalog = { aisles: CosmeticsShelf[]; offers: Product[] };

let catalogCache: Promise<Catalog> | null = null;

function loadShelf(query: ProductListQuery): Promise<Product[]> {
  return fetchProductListPage({ shop: "cosmetics", sort: "top", ...query }, 0, COSMETICS_SHELF_SIZE)
    .then(({ products }) => products.filter((p) => Boolean(p.image)))
    .catch(() => []);
}

/** Cached per session so returning to the Cosmetics home is instant. */
function loadCatalog(): Promise<Catalog> {
  if (!catalogCache) {
    const pending = Promise.all([
      Promise.all(COSMETICS_AISLES.map((aisle) => loadShelf({ aisle: aisle.id }))),
      loadShelf({ sale: true }),
    ]).then(([shelves, offers]) => {
      const aisles = COSMETICS_AISLES.map((aisle, i) => ({ ...aisle, products: shelves[i] }));
      if (aisles.every((a) => a.products.length === 0)) catalogCache = null;
      return { aisles, offers };
    });
    catalogCache = pending;
  }
  return catalogCache;
}

/**
 * Top products per Cosmetics aisle plus a row of offers, paged from the API
 * (the full catalogue is far too large to download for the home page).
 */
export function useCosmeticsCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then((next) => {
      if (!cancelled) setCatalog(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    aisles: catalog?.aisles ?? [],
    offers: catalog?.offers ?? [],
    loading: catalog === null,
  };
}

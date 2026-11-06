import { useEffect, useState } from "react";
import { fetchProductListPage } from "../api/client";
import { FRESH_HOME_CATEGORY_ORDER } from "../data/homeRows";
import type { Product } from "../types/product";

const SHELF_SIZE = 24;

const shelfCache = new Map<string, Promise<Product[]>>();

/** Cached per session so returning to Fresh home keeps packed aisle rows warm. */
export function loadFreshCategoryShelf(categoryId: string): Promise<Product[]> {
  let pending = shelfCache.get(categoryId);
  if (!pending) {
    pending = fetchProductListPage(
      { shop: "fresh", category: categoryId },
      0,
      SHELF_SIZE,
    )
      .then(({ products }) => products.filter((p) => Boolean(p.image)))
      .catch(() => {
        shelfCache.delete(categoryId);
        return [];
      });
    shelfCache.set(categoryId, pending);
  }
  return pending;
}

/**
 * Eagerly loads high-count Fresh category shelves so poultry/fish/nuts rows
 * appear even while the main catalogue's first page is fruit-heavy.
 */
export function useFreshHomeShelfBoost(): Product[] {
  const [extra, setExtra] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Skip fresh-fruits — already covered by the first catalogue batch.
    const ids = FRESH_HOME_CATEGORY_ORDER.filter((id) => id !== "fresh-fruits");
    Promise.all(ids.map(loadFreshCategoryShelf)).then((shelves) => {
      if (cancelled) return;
      const byId = new Map<string, Product>();
      for (const shelf of shelves) {
        for (const product of shelf) byId.set(product.id, product);
      }
      setExtra([...byId.values()]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return extra;
}

import { useEffect, useState } from "react";
import { fetchProductListPage, type ProductListQuery } from "../api/client";
import { PHARMACY_AISLES } from "../data/pharmacy";
import type { Product } from "../types/product";

/** First products of each pharmacy aisle on the shop home. */
export const PHARMACY_SHELF_SIZE = 8;
const SHELF_CONCURRENCY = 2;

export type PharmacyShelf = (typeof PHARMACY_AISLES)[number] & { products: Product[] };
type Catalog = { aisles: PharmacyShelf[]; offers: Product[] };

let catalogMemory: Catalog | null = null;

function loadShelf(query: ProductListQuery): Promise<Product[]> {
  return fetchProductListPage({ shop: "pharmacy", sort: "top", ...query }, 0, PHARMACY_SHELF_SIZE)
    .then(({ products }) => products)
    .catch(() => []);
}

function emptyAisles(): PharmacyShelf[] {
  return PHARMACY_AISLES.map((aisle) => ({ ...aisle, products: [] }));
}

/**
 * Top products per Pharmacy aisle, loaded a couple of shelves at a time so the
 * category tiles paint before the catalogue. Offers load after the aisles.
 */
export function usePharmacyCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(
    () => catalogMemory ?? { aisles: emptyAisles(), offers: [] }
  );

  useEffect(() => {
    if (catalogMemory) return;
    let cancelled = false;
    const aisles = emptyAisles();
    const offers: Product[] = [];

    const jobs: Array<() => Promise<void>> = [
      ...PHARMACY_AISLES.map((aisle, index) => async () => {
        const products = await loadShelf({ aisle: aisle.id });
        aisles[index] = { ...aisle, products };
        if (!cancelled) setCatalog({ aisles: aisles.map((row) => ({ ...row })), offers: [...offers] });
      }),
      async () => {
        const products = await loadShelf({ sale: true });
        offers.push(...products);
        if (!cancelled) setCatalog({ aisles: aisles.map((row) => ({ ...row })), offers: [...offers] });
      },
    ];

    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor];
        cursor += 1;
        await job();
      }
    };

    void Promise.all(Array.from({ length: SHELF_CONCURRENCY }, () => worker())).then(() => {
      if (cancelled) return;
      const next = { aisles: aisles.map((row) => ({ ...row })), offers: [...offers] };
      if (next.aisles.some((aisle) => aisle.products.length > 0) || next.offers.length > 0) {
        catalogMemory = next;
      }
      setCatalog(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    aisles: catalog.aisles,
    offers: catalog.offers,
  };
}

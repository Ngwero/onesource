import { useEffect, useState } from "react";
import { fetchProductListPage, type ProductListQuery } from "../api/client";
import { COSMETICS_AISLES } from "../data/cosmetics";
import type { Product } from "../types/product";

/** First products of each cosmetics aisle on the shop home. */
export const COSMETICS_SHELF_SIZE = 6;
const SHELF_CONCURRENCY = 2;

export type CosmeticsShelf = (typeof COSMETICS_AISLES)[number] & { products: Product[] };
type Catalog = { aisles: CosmeticsShelf[]; offers: Product[] };

let catalogMemory: Catalog | null = null;
let catalogRun: Promise<Catalog> | null = null;
const listeners = new Set<(catalog: Catalog, settled: boolean) => void>();

function loadShelf(query: ProductListQuery): Promise<Product[]> {
  return fetchProductListPage({ shop: "cosmetics", sort: "newest", ...query }, 0, COSMETICS_SHELF_SIZE)
    .then(({ products }) => products.filter((p) => Boolean(p.image)))
    .catch(() => []);
}

function emptyAisles(): CosmeticsShelf[] {
  return COSMETICS_AISLES.map((aisle) => ({ ...aisle, products: [] }));
}

function publish(catalog: Catalog, settled: boolean) {
  const stocked =
    catalog.offers.length > 0 || catalog.aisles.some((aisle) => aisle.products.length > 0);
  if (settled && stocked) catalogMemory = catalog;
  for (const listener of listeners) listener(catalog, settled);
}

/**
 * One shared run for the session. React Strict Mode mounts twice; a second
 * start would fire every aisle query again and keep the first screen waiting.
 */
function ensureCatalog(): Promise<Catalog> {
  if (catalogMemory) return Promise.resolve(catalogMemory);
  if (catalogRun) return catalogRun;

  const aisles = emptyAisles();
  const offers: Product[] = [];
  const jobs: Array<() => Promise<void>> = [
    ...COSMETICS_AISLES.map((aisle, index) => async () => {
      const products = await loadShelf({ aisle: aisle.id });
      aisles[index] = { ...aisle, products };
      publish({ aisles: aisles.map((row) => ({ ...row })), offers: [...offers] }, false);
    }),
    async () => {
      const products = await loadShelf({ sale: true });
      offers.push(...products);
      publish({ aisles: aisles.map((row) => ({ ...row })), offers: [...offers] }, false);
    },
  ];

  catalogRun = (async () => {
    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor];
        cursor += 1;
        await job();
      }
    };
    await Promise.all(Array.from({ length: SHELF_CONCURRENCY }, () => worker()));
    const next = { aisles: aisles.map((row) => ({ ...row })), offers: [...offers] };
    const keep = next.aisles.some((aisle) => aisle.products.length > 0) || next.offers.length > 0;
    if (!keep) catalogRun = null;
    publish(next, true);
    return next;
  })();

  return catalogRun;
}

/**
 * First screen of each Cosmetics aisle, a couple of shelves at a time, so the
 * home page can paint before the rest of the catalogue arrives. Offers follow
 * the aisle rows. Newest-first stays on the created_at index; ranking a whole
 * aisle by reviews is a sort of thousands of rows.
 */
export function useCosmeticsCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(
    () => catalogMemory ?? { aisles: emptyAisles(), offers: [] }
  );
  const [settled, setSettled] = useState(() => catalogMemory != null);

  useEffect(() => {
    const onUpdate = (next: Catalog, done: boolean) => {
      setCatalog(next);
      if (done) setSettled(true);
    };
    listeners.add(onUpdate);
    void ensureCatalog();
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  return {
    aisles: catalog.aisles,
    offers: catalog.offers,
    settled,
  };
}

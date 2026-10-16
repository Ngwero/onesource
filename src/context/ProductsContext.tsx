import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import i18n from "../i18n";
import type { Product, Category } from "../types/product";
import {
  fetchCardCatalog,
  fetchFirstProductsBatch,
  fetchCategories,
  fetchProductById,
} from "../api/client";
import {
  categories as staticCategories,
  productMatchesCategory,
  normalizeCategoryId,
} from "../data/categories";
import { isSpecialtyProduct, SPECIALTY_SHOP_CATEGORY_IDS } from "../utils/shopMode";

export type ProductShop = "fresh" | "kitchen" | "cosmetics";

const SHOPS: ProductShop[] = ["fresh", "kitchen", "cosmetics"];

/** Newest Fresh products shown while the rest of the catalogue loads in the background. */
const FIRST_BATCH_SIZE = 48;
const BY_ID_CONCURRENCY = 6;

function shopOfProductId(id: string): ProductShop | "pharmacy" {
  if (id.startsWith("pharmacy-")) return "pharmacy";
  if (id.startsWith("kitchen-")) return "kitchen";
  if (id.startsWith("cosmetics-")) return "cosmetics";
  return "fresh";
}

type ProductsContextType = {
  products: Product[];
  categories: Category[];
  /** True until the first Fresh products are on screen. */
  loading: boolean;
  /** True until that shop has something to show (or failed); see `ensureShop`. */
  shopLoading: Record<ProductShop, boolean>;
  /**
   * Start loading a shop's catalogue. Kitchen and Cosmetics hold tens of thousands of
   * products, so pages list them from the API instead; prefer `ensureProducts` for a few ids.
   */
  ensureShop: (shop: ProductShop) => void;
  /** Load just these products (e.g. saved or recently viewed Kitchen/Cosmetics items). */
  ensureProducts: (ids: readonly string[]) => void;
  error: string | null;
  refresh: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (categoryId: string) => Product[];
  getProductCountByCategory: () => Record<string, number>;
  normalizeCategory: (raw: string) => string;
};

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [byShop, setByShop] = useState<Record<ProductShop, Product[]>>({
    fresh: [],
    kitchen: [],
    cosmetics: [],
  });
  const [categories, setCategories] = useState<Category[]>(staticCategories);
  const [shopLoading, setShopLoading] = useState<Record<ProductShop, boolean>>({
    fresh: true,
    kitchen: true,
    cosmetics: true,
  });
  /** Shops whose `byShop` rows are full products, not just the first card-only batch. */
  const [complete, setComplete] = useState<Record<ProductShop, boolean>>({
    fresh: false,
    kitchen: false,
    cosmetics: false,
  });
  const [byId, setById] = useState<Record<string, Product>>({});
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const requested = useRef(new Set<ProductShop>());
  const requestedIds = useRef(new Set<string>());
  const inflight = useRef(new Map<ProductShop, Promise<void>>());
  const generation = useRef<Record<ProductShop, number>>({
    fresh: 0,
    kitchen: 0,
    cosmetics: 0,
  });

  // The first screen waits only for one small page; the full catalogue follows in the
  // background. Overlapping callers share one load so a fast failure cannot clear
  // loading while a slower one is still out.
  const loadShop = useCallback((shop: ProductShop, force = false) => {
    if (!force) {
      const existing = inflight.current.get(shop);
      if (existing) return existing;
    }

    const gen = generation.current[shop] + 1;
    generation.current[shop] = gen;
    const current = () => generation.current[shop] === gen;
    setShopLoading((prev) => ({ ...prev, [shop]: true }));

    const run = (async () => {
      let shown = false;
      try {
        const first = await fetchFirstProductsBatch(shop, FIRST_BATCH_SIZE);
        if (!current()) return;
        setByShop((prev) => ({ ...prev, [shop]: first.products }));
        setComplete((prev) => ({ ...prev, [shop]: false }));
        if (shop === "fresh") setError(null);
        setShopLoading((prev) => ({ ...prev, [shop]: false }));
        shown = true;

        // Kitchen (~24k) and Cosmetics (~18k) stay paged by their own screens.
        // Fresh is a few hundred card rows. Full rows (descriptions + details)
        // are the ~400KB query that stalls a cold database, so they stay on
        // the product page, which loads one product by id.
        if (shop !== "fresh" || !first.hasMore) return;
        const rest = await fetchCardCatalog(shop);
        if (!current()) return;
        if (rest.products.length) {
          setByShop((prev) => ({ ...prev, [shop]: rest.products }));
        }
      } catch (e) {
        if (!current()) return;
        // Once the first batch is on screen, a failed background fill keeps it.
        if (!shown) {
          setByShop((prev) => ({ ...prev, [shop]: [] }));
          if (shop === "fresh") {
            setError(e instanceof Error ? e.message : i18n.t("errors.loadProducts"));
          }
        }
      } finally {
        if (current()) {
          inflight.current.delete(shop);
          setShopLoading((prev) => ({ ...prev, [shop]: false }));
        }
      }
    })();

    inflight.current.set(shop, run);
    return run;
  }, []);

  const ensureProducts = useCallback(
    (ids: readonly string[]) => {
      const missing: string[] = [];
      for (const id of ids) {
        // Fresh products come with the Fresh catalogue, which always loads.
        if (!id || requestedIds.current.has(id) || shopOfProductId(id) === "fresh") continue;
        requestedIds.current.add(id);
        missing.push(id);
      }
      if (!missing.length) return;

      let next = 0;
      const worker = async () => {
        while (next < missing.length) {
          const id = missing[next++];
          const product = await fetchProductById(id).catch(() => undefined);
          if (product) setById((prev) => ({ ...prev, [id]: product }));
          else requestedIds.current.delete(id);
        }
      };
      for (let i = 0; i < Math.min(BY_ID_CONCURRENCY, missing.length); i++) void worker();
    },
    []
  );

  const ensureShop = useCallback(
    (shop: ProductShop) => {
      if (requested.current.has(shop)) return;
      requested.current.add(shop);
      void loadShop(shop);
    },
    [loadShop]
  );

  const load = useCallback(async (force = false) => {
    setError(null);
    requested.current.add("fresh");
    await Promise.all([
      ...SHOPS.filter((shop) => requested.current.has(shop)).map((shop) => loadShop(shop, force)),
      fetchCategories()
        .then((cats) => setCategories(cats.length ? cats : staticCategories))
        .catch(() => setCategories(staticCategories)),
    ]);
  }, [loadShop]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
  }, [load]);

  const products = useMemo(() => {
    const listed = [...byShop.fresh, ...byShop.kitchen, ...byShop.cosmetics];
    const extras = Object.values(byId);
    if (!extras.length) return listed;
    const seen = new Set(listed.map((p) => p.id));
    return [...listed, ...extras.filter((p) => !seen.has(p.id))];
  }, [byShop, byId]);

  // First-batch rows are cards (no description/details): product pages fetch the full
  // product instead of rendering one until that shop's catalogue is complete.
  const getProductById = useCallback(
    (id: string) => {
      if (byId[id]) return byId[id];
      const shop = shopOfProductId(id);
      if (shop === "pharmacy" || !complete[shop]) return undefined;
      return products.find((p) => p.id === id);
    },
    [products, byId, complete]
  );

  const getProductsByCategory = useCallback(
    (categoryId: string) =>
      products.filter((p) => {
        if (!productMatchesCategory(p.category, categoryId)) return false;
        const listingSpecialty = SPECIALTY_SHOP_CATEGORY_IDS.has(
          normalizeCategoryId(categoryId)
        );
        return listingSpecialty || !isSpecialtyProduct(p);
      }),
    [products]
  );

  const getProductCountByCategory = useCallback(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const id = normalizeCategoryId(p.category);
      if (isSpecialtyProduct(p) && !SPECIALTY_SHOP_CATEGORY_IDS.has(id)) continue;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        categories,
        loading: shopLoading.fresh,
        shopLoading,
        ensureShop,
        ensureProducts,
        error,
        refresh: () => load(true),
        getProductById,
        getProductsByCategory,
        getProductCountByCategory,
        normalizeCategory: normalizeCategoryId,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
}

export { fetchProductById };

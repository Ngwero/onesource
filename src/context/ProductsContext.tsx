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
import { fetchProducts, fetchCategories, fetchProductById } from "../api/client";
import {
  categories as staticCategories,
  productMatchesCategory,
  normalizeCategoryId,
} from "../data/categories";
import { isSpecialtyProduct, SPECIALTY_SHOP_CATEGORY_IDS } from "../utils/shopMode";

export type ProductShop = "fresh" | "kitchen" | "cosmetics";

const SHOPS: ProductShop[] = ["fresh", "kitchen", "cosmetics"];

type ProductsContextType = {
  products: Product[];
  categories: Category[];
  /** True while the Fresh catalogue is loading. */
  loading: boolean;
  /** True until that shop's full catalogue has loaded (or failed); see `ensureShop`. */
  shopLoading: Record<ProductShop, boolean>;
  /** Start loading a shop's full catalogue; Kitchen and Cosmetics only load on demand. */
  ensureShop: (shop: ProductShop) => void;
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
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const requested = useRef(new Set<ProductShop>());
  const inflight = useRef(new Map<ProductShop, Promise<void>>());
  const generation = useRef<Record<ProductShop, number>>({
    fresh: 0,
    kitchen: 0,
    cosmetics: 0,
  });

  // Each shop renders as soon as its own catalogue arrives; the large Kitchen
  // catalogue must not hold up Fresh or Cosmetics. Overlapping callers share one
  // request so a fast failure cannot clear loading while a slower one is still out.
  const loadShop = useCallback((shop: ProductShop, force = false) => {
    if (!force) {
      const existing = inflight.current.get(shop);
      if (existing) return existing;
    }

    const gen = generation.current[shop] + 1;
    generation.current[shop] = gen;
    setShopLoading((prev) => ({ ...prev, [shop]: true }));

    const run = (async () => {
      try {
        const rows = await fetchProducts({ shop });
        if (generation.current[shop] !== gen) return;
        setByShop((prev) => ({ ...prev, [shop]: rows }));
        if (shop === "fresh") setError(null);
      } catch (e) {
        if (generation.current[shop] !== gen) return;
        setByShop((prev) => ({ ...prev, [shop]: [] }));
        if (shop === "fresh") {
          setError(e instanceof Error ? e.message : i18n.t("errors.loadProducts"));
        }
      } finally {
        if (generation.current[shop] !== gen) return;
        inflight.current.delete(shop);
        setShopLoading((prev) => ({ ...prev, [shop]: false }));
      }
    })();

    inflight.current.set(shop, run);
    return run;
  }, []);

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

  const products = useMemo(
    () => [...byShop.fresh, ...byShop.kitchen, ...byShop.cosmetics],
    [byShop]
  );

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
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

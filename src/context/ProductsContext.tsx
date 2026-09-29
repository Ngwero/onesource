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
  shopLoading: Record<ProductShop, boolean>;
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

  const load = useCallback(async () => {
    setShopLoading({ fresh: true, kitchen: true, cosmetics: true });
    setError(null);

    // Each shop renders as soon as its own catalogue arrives; the large Kitchen
    // catalogue must not hold up Fresh or Cosmetics.
    const loadShop = async (shop: ProductShop) => {
      try {
        const rows = await fetchProducts({ shop });
        setByShop((prev) => ({ ...prev, [shop]: rows }));
      } catch (e) {
        setByShop((prev) => ({ ...prev, [shop]: [] }));
        if (shop === "fresh") {
          setError(e instanceof Error ? e.message : i18n.t("errors.loadProducts"));
        }
      } finally {
        setShopLoading((prev) => ({ ...prev, [shop]: false }));
      }
    };

    await Promise.all([
      ...SHOPS.map(loadShop),
      fetchCategories()
        .then((cats) => setCategories(cats.length ? cats : staticCategories))
        .catch(() => setCategories(staticCategories)),
    ]);
  }, []);

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
        error,
        refresh: load,
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

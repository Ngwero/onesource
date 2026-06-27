import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

type ProductsContextType = {
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (categoryId: string) => Product[];
  getProductCountByCategory: () => Record<string, number>;
  normalizeCategory: (raw: string) => string;
};

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(staticCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, cats] = await Promise.all([
        fetchProducts(),
        fetchCategories().catch(() => staticCategories),
      ]);
      setProducts(prods);
      setCategories(cats.length ? cats : staticCategories);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : i18n.t("errors.loadProducts")
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const getProductsByCategory = useCallback(
    (categoryId: string) =>
      products.filter((p) => productMatchesCategory(p.category, categoryId)),
    [products]
  );

  const getProductCountByCategory = useCallback(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const id = normalizeCategoryId(p.category);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        categories,
        loading,
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

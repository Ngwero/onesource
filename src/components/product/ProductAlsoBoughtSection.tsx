import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { ProductRecommendationSection } from "./ProductRecommendationSection";

type Props = {
  productId: string;
};

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/** Rule-based “customers also bought” from order co-occurrence when available. */
export function ProductAlsoBoughtSection({ productId }: Props) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/products/${encodeURIComponent(productId)}/also-bought`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products?: Product[] }) => {
        if (!cancelled) setProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (products.length === 0) return null;

  return (
    <ProductRecommendationSection
      sectionId="pdp-also-bought-heading"
      className="pdp-related-section"
      title={t("product.customersAlsoBought")}
      subtitle={t("product.customersAlsoBoughtSubtitle")}
      products={products}
      viewAllHref="/products"
      viewAllLabel={t("product.viewAllProducts")}
    />
  );
}

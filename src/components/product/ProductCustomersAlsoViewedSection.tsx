import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { ProductRecommendationSection } from "./ProductRecommendationSection";

type Props = {
  products: Product[];
};

export function ProductCustomersAlsoViewedSection({ products }: Props) {
  const { t } = useTranslation();

  return (
    <ProductRecommendationSection
      sectionId="pdp-also-viewed-heading"
      className="pdp-related-section pdp-also-viewed-section"
      title={t("product.customersAlsoViewed")}
      subtitle={t("product.customersAlsoViewedSubtitle")}
      products={products}
      viewAllHref="/products"
      viewAllLabel={t("product.viewAllProducts")}
    />
  );
}

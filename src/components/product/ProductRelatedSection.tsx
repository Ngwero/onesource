import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { ProductRecommendationSection } from "./ProductRecommendationSection";

type Props = {
  products: Product[];
  categoryId: string;
  categoryName: string;
};

export function ProductRelatedSection({ products, categoryId, categoryName }: Props) {
  const { t } = useTranslation();

  return (
    <ProductRecommendationSection
      sectionId="pdp-related-heading"
      title={t("product.relatedProducts")}
      subtitle={t("product.relatedProductsSubtitle")}
      products={products}
      viewAllHref={`/category/${categoryId}`}
      viewAllLabel={t("product.viewAllInCategory", { category: categoryName })}
    />
  );
}

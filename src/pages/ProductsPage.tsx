import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProductGrid } from "../components/ProductGrid";
import { ScrollReveal } from "../components/ScrollReveal";
import { PageContainer } from "../components/PageContainer";
import { ShopListingLayout } from "../components/shop/ShopListingLayout";
import { useProducts } from "../context/ProductsContext";
import {
  normalizeCategoryId,
  productMatchesCategory,
} from "../data/categories";
import { useCategoryName } from "../i18n/useLocalizedProduct";

export function ProductsPage() {
  const { t } = useTranslation();
  const { products } = useProducts();
  const [params] = useSearchParams();
  const rawCategory = params.get("category") ?? "";
  const rawCategoryParam = rawCategory.trim();
  const categoryId = rawCategoryParam ? normalizeCategoryId(rawCategoryParam) : "";
  const displayCategoryId = rawCategoryParam || categoryId;
  const categoryName = useCategoryName(displayCategoryId);
  const hasCategoryFilter = rawCategoryParam.length > 0;
  const onSaleOnly = params.get("sale") === "1";

  const baseProducts = useMemo(() => {
    if (!rawCategoryParam) return products;
    return products.filter((p) =>
      productMatchesCategory(p.category, rawCategoryParam)
    );
  }, [products, rawCategoryParam]);

  const header = (
    <ScrollReveal variant="fade-up">
      <nav className="text-xs sm:text-sm text-text-muted mb-2">
        <Link to="/" className="hover:text-accent">
          {t("common.home")}
        </Link>
        <span className="mx-2">/</span>
        <span>{t("products.catalogue")}</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
        {onSaleOnly
          ? t("nav.seasonalDeals")
          : hasCategoryFilter
            ? categoryName
            : t("products.allTitle")}
      </h1>
      <p className="text-text-muted mt-2 text-sm sm:text-base max-w-2xl">
        {onSaleOnly
          ? t("home.rows.freshDealsSub")
          : hasCategoryFilter
            ? t("products.categorySubtitle", { category: categoryName })
            : t("products.allSubtitle")}
      </p>
    </ScrollReveal>
  );

  const emptyState = (
    <div className="card p-8 sm:p-12 text-center max-w-lg mx-auto w-full">
      <p className="text-text-muted">{t("products.emptyCategory")}</p>
      <Link to="/products" className="btn-primary mt-6 inline-flex">
        {t("products.showAll")}
      </Link>
    </div>
  );

  return (
    <PageContainer className="py-6 sm:py-8 pb-8 sm:pb-16 w-full">
      <ShopListingLayout
        key={`${displayCategoryId || "all"}-${onSaleOnly ? "sale" : "all"}`}
        products={baseProducts}
        header={header}
        initialFilters={{
          categoryIds: hasCategoryFilter ? [displayCategoryId] : [],
          onSaleOnly,
        }}
        showCategoryFilter={!hasCategoryFilter}
        emptyState={emptyState}
      >
        {(filtered) => <ProductGrid products={filtered} />}
      </ShopListingLayout>
    </PageContainer>
  );
}

import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProductGrid } from "../components/ProductGrid";
import { ScrollReveal } from "../components/ScrollReveal";
import { PageContainer } from "../components/PageContainer";
import { ShopListingLayout } from "../components/shop/ShopListingLayout";
import { useProducts } from "../context/ProductsContext";
import { productMatchesSearch } from "../utils/searchMatch";
import { AGRI_CATEGORIES, normalizeCategoryId } from "../data/categories";

export function SearchPage() {
  const { t } = useTranslation();
  const { products } = useProducts();
  const [params] = useSearchParams();
  const query = params.get("q")?.toLowerCase() ?? "";

  const livestockCategoryIds = AGRI_CATEGORIES.filter(
    (c) => c.group === "livestock"
  ).map((c) => c.id);
  const livestockSet = new Set(livestockCategoryIds);
  const qTrim = query.trim();
  const isMeatOnly = qTrim === "meat" || qTrim === "meats";

  const results = useMemo(
    () =>
      isMeatOnly
        ? products.filter((p) => livestockSet.has(normalizeCategoryId(p.category)))
        : products.filter((p) => productMatchesSearch(p, query)),
    [products, query, isMeatOnly]
  );

  const header = (
    <ScrollReveal variant="fade-up">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">
        {results.length === 0 ? t("search.noResults", { query }) : t("search.forQuery", { query })}
      </h1>
    </ScrollReveal>
  );

  const emptyState = (
    <div className="card p-8 sm:p-12 text-center max-w-md mx-auto w-full">
      <p className="text-text-muted text-sm sm:text-base">{t("search.tryDifferent")}</p>
      <Link to="/categories" className="btn-primary mt-6 inline-flex w-full sm:w-auto justify-center">
        {t("cart.browseCategories")}
      </Link>
    </div>
  );

  if (!query) {
    return (
      <PageContainer className="py-6 sm:py-8 pb-8 sm:pb-16 w-full">
        <div className="card p-8 text-center max-w-md mx-auto">
          <p className="text-text-muted">{t("search.tryDifferent")}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-6 sm:py-8 pb-8 sm:pb-16 w-full">
      <ShopListingLayout
        products={results}
        header={header}
        searchQuery={query}
        emptyState={emptyState}
      >
        {(filtered) => <ProductGrid products={filtered} />}
      </ShopListingLayout>
    </PageContainer>
  );
}

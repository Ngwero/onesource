import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { CosmeticsListing } from "../components/cosmetics/CosmeticsListing";
import { useCosmeticsCatalog } from "../hooks/useCosmeticsCatalog";
import { productMatchesSearch } from "../utils/searchMatch";

export function CosmeticsSearchPage() {
  const { t } = useTranslation();
  const { cosmeticsProducts, loading } = useCosmeticsCatalog();
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";

  const results = useMemo(() => {
    if (!query) return [];
    return cosmeticsProducts.filter((p) => productMatchesSearch(p, query));
  }, [cosmeticsProducts, query]);

  return (
    <div className="cos-page">
      <PageContainer className="cos-shell">
        <nav className="cos-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/cosmetics">{t("cosmetics.brand")}</Link>
          <span aria-hidden>›</span>
          <span>{t("common.search")}</span>
        </nav>

        <header className="cos-page-head">
          <h1>
            {query
              ? results.length === 0
                ? t("search.noResults", { query })
                : t("search.forQuery", { query })
              : t("cosmetics.searchTitle")}
          </h1>
          <p>
            {query
              ? t("kitchen.categoryCount", { count: results.length })
              : t("cosmetics.searchHint")}
          </p>
        </header>

        {query && loading && cosmeticsProducts.length === 0 ? (
          <p className="cos-empty">{t("common.loading")}</p>
        ) : results.length === 0 ? (
          <div className="cos-empty">
            <p>{t("search.tryDifferent")}</p>
            <Link to="/cosmetics/categories" className="cos-btn cos-btn--outline">
              {t("cosmetics.navCategories")}
            </Link>
          </div>
        ) : (
          <CosmeticsListing key={query} products={results} />
        )}
      </PageContainer>
    </div>
  );
}

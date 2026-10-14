import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { CosmeticsListing } from "../components/cosmetics/CosmeticsListing";

export function CosmeticsSearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";

  const tryDifferent = (
    <div className="cos-empty">
      <p>{t("search.tryDifferent")}</p>
      <Link to="/cosmetics/categories" className="cos-btn cos-btn--outline">
        {t("cosmetics.navCategories")}
      </Link>
    </div>
  );

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
            {query ? t("search.forQuery", { query }) : t("cosmetics.searchTitle")}
          </h1>
          {!query && <p>{t("cosmetics.searchHint")}</p>}
        </header>

        {query ? (
          <CosmeticsListing
            key={query}
            baseQuery={{ q: query }}
            emptyState={
              <>
                <p className="cos-empty">{t("search.noResults", { query })}</p>
                {tryDifferent}
              </>
            }
          />
        ) : (
          tryDifferent
        )}
      </PageContainer>
    </div>
  );
}

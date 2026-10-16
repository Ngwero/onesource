import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { PharmacyListing } from "../components/pharmacy/PharmacyListing";

export function PharmacySearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";

  return (
    <div className="cos-page pharm-photos">
      <PageContainer className="cos-shell">
        <nav className="cos-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/pharmacy">{t("pharmacy.brand")}</Link>
          <span aria-hidden>›</span>
          <span>{t("common.search")}</span>
        </nav>
        <header className="cos-page-head">
          <h1>{query ? t("search.forQuery", { query }) : t("pharmacy.searchTitle")}</h1>
          {!query && <p>{t("pharmacy.searchHint")}</p>}
        </header>
        {query ? (
          <PharmacyListing
            key={query}
            baseQuery={{ q: query }}
            emptyState={
              <div className="cos-empty">
                <p>{t("search.tryDifferent")}</p>
                <Link to="/pharmacy/categories" className="cos-btn cos-btn--outline">
                  {t("pharmacy.navCategories")}
                </Link>
              </div>
            }
          />
        ) : null}
      </PageContainer>
    </div>
  );
}

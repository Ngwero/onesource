import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { CosmeticsListing } from "../components/cosmetics/CosmeticsListing";

export function CosmeticsProductsPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const saleOnly = params.get("sale") === "1";
  const title = saleOnly ? t("kitchen.home.feedOffers") : t("cosmetics.navAll");

  return (
    <div className="cos-page">
      <PageContainer className="cos-shell">
        <nav className="cos-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/cosmetics">{t("cosmetics.brand")}</Link>
          <span aria-hidden>›</span>
          <span>{title}</span>
        </nav>

        <header className="cos-page-head">
          <h1>{title}</h1>
        </header>

        <CosmeticsListing
          key={saleOnly ? "sale" : "all"}
          baseQuery={{ sale: saleOnly }}
          emptyState={<p className="cos-empty">{t("cosmetics.empty")}</p>}
        />
      </PageContainer>
    </div>
  );
}

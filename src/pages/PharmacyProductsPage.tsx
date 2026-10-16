import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { PharmacyListing } from "../components/pharmacy/PharmacyListing";

export function PharmacyProductsPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const saleOnly = params.get("sale") === "1";
  const title = saleOnly ? t("kitchen.home.feedOffers") : t("pharmacy.navAll");

  return (
    <div className="cos-page pharm-photos">
      <PageContainer className="cos-shell">
        <nav className="cos-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/pharmacy">{t("pharmacy.brand")}</Link>
          <span aria-hidden>›</span>
          <span>{title}</span>
        </nav>
        <header className="cos-page-head">
          <h1>{title}</h1>
        </header>
        <PharmacyListing
          baseQuery={{ sale: saleOnly }}
          emptyState={<p className="cos-empty">{t("pharmacy.empty")}</p>}
        />
      </PageContainer>
    </div>
  );
}

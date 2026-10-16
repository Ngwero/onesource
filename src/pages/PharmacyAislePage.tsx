import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { PharmacyListing } from "../components/pharmacy/PharmacyListing";
import { PHARMACY_AISLES } from "../data/pharmacy";
import { isValidPharmacyAisleId } from "../utils/pharmacyMode";

export function PharmacyAislePage() {
  const { t } = useTranslation();
  const { aisleId } = useParams<{ aisleId: string }>();

  if (!isValidPharmacyAisleId(aisleId)) {
    return <Navigate to="/pharmacy/categories" replace />;
  }

  const aisle = PHARMACY_AISLES.find((item) => item.id === aisleId)!;
  const aisleTitle = t(`pharmacy.aisles.${aisle.id}`, { defaultValue: aisle.title });

  return (
    <div className="cos-page pharm-photos">
      <PageContainer className="cos-shell">
        <nav className="cos-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/pharmacy">{t("pharmacy.brand")}</Link>
          <span aria-hidden>›</span>
          <Link to="/pharmacy/categories">{t("pharmacy.navCategories")}</Link>
          <span aria-hidden>›</span>
          <span>{aisleTitle}</span>
        </nav>
        <header className="cos-page-head">
          <h1>{aisleTitle}</h1>
        </header>
        <PharmacyListing
          key={aisle.id}
          baseQuery={{ aisle: aisle.id }}
          emptyState={<p className="cos-empty">{t("pharmacy.empty")}</p>}
        />
      </PageContainer>
    </div>
  );
}

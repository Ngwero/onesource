import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { CosmeticsListing } from "../components/cosmetics/CosmeticsListing";
import { COSMETICS_AISLES } from "../data/cosmetics";
import { isValidCosmeticsAisleId } from "../utils/cosmeticsMode";

export function CosmeticsAislePage() {
  const { t } = useTranslation();
  const { aisleId } = useParams<{ aisleId: string }>();

  if (!isValidCosmeticsAisleId(aisleId)) {
    return <Navigate to="/cosmetics/categories" replace />;
  }

  const aisle = COSMETICS_AISLES.find((a) => a.id === aisleId)!;
  const aisleTitle = t(`cosmetics.aisles.${aisle.id}`, { defaultValue: aisle.title });

  return (
    <div className="cos-page">
      <PageContainer className="cos-shell">
        <nav className="cos-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/cosmetics">{t("cosmetics.brand")}</Link>
          <span aria-hidden>›</span>
          <Link to="/cosmetics/categories">{t("cosmetics.navCategories")}</Link>
          <span aria-hidden>›</span>
          <span>{aisleTitle}</span>
        </nav>

        <header className="cos-page-head">
          <h1>{aisleTitle}</h1>
        </header>

        <CosmeticsListing
          key={aisle.id}
          baseQuery={{ aisle: aisle.id }}
          emptyState={<p className="cos-empty">{t("cosmetics.empty")}</p>}
        />
      </PageContainer>
    </div>
  );
}

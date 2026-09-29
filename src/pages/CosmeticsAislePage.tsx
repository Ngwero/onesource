import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { CosmeticsListing } from "../components/cosmetics/CosmeticsListing";
import { COSMETICS_AISLES } from "../data/cosmetics";
import { useCosmeticsCatalog } from "../hooks/useCosmeticsCatalog";
import { filterCosmeticsAisle, isValidCosmeticsAisleId } from "../utils/cosmeticsMode";

export function CosmeticsAislePage() {
  const { t } = useTranslation();
  const { aisleId } = useParams<{ aisleId: string }>();
  const { cosmeticsProducts, loading } = useCosmeticsCatalog();

  if (!isValidCosmeticsAisleId(aisleId)) {
    return <Navigate to="/cosmetics/categories" replace />;
  }

  const aisle = COSMETICS_AISLES.find((a) => a.id === aisleId)!;
  const aisleTitle = t(`cosmetics.aisles.${aisle.id}`, { defaultValue: aisle.title });
  const products = filterCosmeticsAisle(cosmeticsProducts, aisleId);

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
          <p>
            {loading && products.length === 0
              ? t("common.loading")
              : t("kitchen.categoryCount", { count: products.length })}
          </p>
        </header>

        {loading && products.length === 0 ? null : products.length === 0 ? (
          <p className="cos-empty">{t("cosmetics.empty")}</p>
        ) : (
          <CosmeticsListing key={aisle.id} products={products} />
        )}
      </PageContainer>
    </div>
  );
}

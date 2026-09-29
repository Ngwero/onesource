import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { CosmeticsListing } from "../components/cosmetics/CosmeticsListing";
import { useCosmeticsCatalog } from "../hooks/useCosmeticsCatalog";

export function CosmeticsProductsPage() {
  const { t } = useTranslation();
  const { cosmeticsProducts, loading } = useCosmeticsCatalog();
  const [params] = useSearchParams();
  const saleOnly = params.get("sale") === "1";
  const products = saleOnly
    ? cosmeticsProducts.filter((p) => p.originalPrice != null && p.originalPrice > p.price)
    : cosmeticsProducts;
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
          <p>{t("kitchen.categoryCount", { count: products.length })}</p>
        </header>

        {loading && cosmeticsProducts.length === 0 ? (
          <p className="cos-empty">{t("common.loading")}</p>
        ) : products.length === 0 ? (
          <p className="cos-empty">{t("cosmetics.empty")}</p>
        ) : (
          <CosmeticsListing key={saleOnly ? "sale" : "all"} products={products} />
        )}
      </PageContainer>
    </div>
  );
}

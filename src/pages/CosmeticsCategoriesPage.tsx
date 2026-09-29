import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { ProductImage } from "../components/ProductImage";
import { useCosmeticsCatalog } from "../hooks/useCosmeticsCatalog";
import { cosmeticsAislePath } from "../utils/cosmeticsMode";

export function CosmeticsCategoriesPage() {
  const { t } = useTranslation();
  const { aisles, cosmeticsProducts, loading } = useCosmeticsCatalog();

  return (
    <div className="cos-page">
      <PageContainer className="cos-shell">
        <nav className="cos-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/cosmetics">{t("cosmetics.brand")}</Link>
          <span aria-hidden>›</span>
          <span>{t("cosmetics.navCategories")}</span>
        </nav>

        <header className="cos-page-head">
          <h1>{t("cosmetics.zonesTitle")}</h1>
          <p>{t("cosmetics.catalogSub", { count: cosmeticsProducts.length })}</p>
        </header>

        {loading && cosmeticsProducts.length === 0 ? (
          <p className="cos-empty">{t("common.loading")}</p>
        ) : (
          <div className="cos-cat-grid">
            {aisles
              .filter((aisle) => aisle.products.length > 0)
              .map((aisle, index) => (
                <Link key={aisle.id} to={cosmeticsAislePath(aisle.id)} className="cos-cat-tile">
                  <span className="cos-cat-media">
                    <ProductImage
                      src={aisle.products[0].image}
                      alt=""
                      size="card"
                      priority={index < 8}
                    />
                  </span>
                  <span className="cos-cat-body">
                    <strong>
                      {aisle.icon}{" "}
                      {t(`cosmetics.aisles.${aisle.id}`, { defaultValue: aisle.title })}
                    </strong>
                    <span>{t("kitchen.categoryCount", { count: aisle.products.length })}</span>
                  </span>
                </Link>
              ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

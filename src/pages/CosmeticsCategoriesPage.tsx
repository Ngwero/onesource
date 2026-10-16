import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { ProductImage } from "../components/ProductImage";
import { COSMETICS_AISLES } from "../data/cosmetics";
import { useCosmeticsCatalog } from "../hooks/useCosmeticsCatalog";
import { cosmeticsAislePath } from "../utils/cosmeticsMode";

export function CosmeticsCategoriesPage() {
  const { t } = useTranslation();
  const { aisles, settled } = useCosmeticsCatalog();
  const imageByAisle = new Map(
    aisles.filter((aisle) => aisle.products[0]?.image).map((aisle) => [aisle.id, aisle.products[0].image])
  );

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
          <p>{t("cosmetics.catalogSub")}</p>
        </header>

        {settled && aisles.every((aisle) => aisle.products.length === 0) ? (
          <p className="cos-empty">{t("cosmetics.empty")}</p>
        ) : (
          <div className="cos-cat-grid">
            {COSMETICS_AISLES.map((aisle, index) => {
              const image = imageByAisle.get(aisle.id);
              return (
                <Link key={aisle.id} to={cosmeticsAislePath(aisle.id)} className="cos-cat-tile">
                  {image ? (
                    <span className="cos-cat-media">
                      <ProductImage src={image} alt="" size="card" priority={index < 4} />
                    </span>
                  ) : null}
                  <span className="cos-cat-body">
                    <strong>
                      {aisle.icon}{" "}
                      {t(`cosmetics.aisles.${aisle.id}`, { defaultValue: aisle.title })}
                    </strong>
                    <span>{t("kitchen.shopCategory")}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

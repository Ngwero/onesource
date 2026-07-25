import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { ProductImage } from "../components/ProductImage";
import { useKitchenCatalog } from "../hooks/useKitchenCatalog";
import { kitchenAislePath } from "../utils/kitchenMode";

export function KitchenCategoriesPage() {
  const { t } = useTranslation();
  const { aisles, kitchenProducts, loading } = useKitchenCatalog();

  return (
    <div className="kitchen-home kitchen-subpage w-full pb-20">
      <PageContainer className="kitchen-home-shell" bleed>
        <nav className="kitchen-sub-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/kitchen">{t("kitchen.brand")}</Link>
          <span aria-hidden>/</span>
          <span>{t("kitchen.home.tabCategories")}</span>
        </nav>

        <header className="kitchen-sub-hero">
          <h1>{t("kitchen.zonesTitle")}</h1>
          <p>
            {t("kitchen.catalogSub", { count: kitchenProducts.length })}
          </p>
          <div className="kitchen-sub-hero-actions">
            <Link to="/kitchen/products" className="kitchen-sub-btn kitchen-sub-btn--primary">
              {t("kitchen.navAll")}
            </Link>
            <Link to="/kitchen/products?sale=1" className="kitchen-sub-btn">
              {t("kitchen.home.feedOffers")}
            </Link>
          </div>
        </header>

        {loading && kitchenProducts.length === 0 ? (
          <p className="kitchen-home-empty">{t("common.loading")}</p>
        ) : (
          <div className="kitchen-cat-grid">
            {aisles.map((aisle, index) => {
              const cover = aisle.products[0];
              return (
                <Link
                  key={aisle.id}
                  to={kitchenAislePath(aisle.id)}
                  className="kitchen-cat-tile"
                >
                  <div className="kitchen-cat-tile-media">
                    {cover ? (
                      <ProductImage
                        src={cover.image}
                        alt=""
                        size="card"
                        className="kitchen-cat-tile-image"
                        priority={index < 6}
                      />
                    ) : (
                      <span className="kitchen-cat-tile-fallback" aria-hidden>
                        {aisle.icon}
                      </span>
                    )}
                  </div>
                  <div className="kitchen-cat-tile-body">
                    <strong>{aisle.title}</strong>
                    <span>
                      {aisle.products.length > 0
                        ? t("kitchen.categoryCount", {
                            count: aisle.products.length,
                          })
                        : t("kitchen.categorySoon")}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

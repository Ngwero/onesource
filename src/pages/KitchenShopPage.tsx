import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { KitchenAisleCarousel } from "../components/kitchen/KitchenAisleCarousel";
import { KitchenInspirationCollage } from "../components/kitchen/KitchenInspirationCollage";
import { getKitchenAisleTitle } from "../i18n/useLocalizedProduct";
import { useKitchenCatalog } from "../hooks/useKitchenCatalog";
import { kitchenAislePath } from "../utils/kitchenMode";
import type { Product } from "../types/product";

function sortBestSellers(products: Product[]) {
  return [...products].sort(
    (a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount
  );
}

export function KitchenShopPage() {
  const { t } = useTranslation();
  const { aisles, kitchenProducts, loading } = useKitchenCatalog();

  /** Every aisle with stock, largest catalogs first. */
  const aisleCarousels = useMemo(
    () =>
      aisles
        .map((aisle) => {
          const title = getKitchenAisleTitle(aisle.id, t, aisle.title);
          return {
            key: aisle.id,
            title,
            count: aisle.products.length,
            seeMoreHref: kitchenAislePath(aisle.id),
            seeMoreLabel: t("categories.fresh.seeCategory", {
              category: title,
            }),
            products: sortBestSellers(aisle.products),
          };
        })
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)),
    [aisles, t]
  );

  return (
    <div className="categories-fresh-page kitchen-fresh-layout">
      <div className="categories-fresh-layout">
        <main className="categories-fresh-main">
          <PageContainer className="categories-fresh-container">
            <KitchenInspirationCollage />

            <div className="categories-fresh-carousels kitchen-ikea-rows">
              {loading && kitchenProducts.length === 0 ? (
                <p className="kitchen-home-empty">{t("common.loading")}</p>
              ) : aisleCarousels.length === 0 ? (
                <div className="categories-fresh-empty card p-8 text-center">
                  <p className="text-text-muted">{t("kitchen.empty")}</p>
                  <Link
                    to="/kitchen/products"
                    className="btn-primary mt-4 inline-flex"
                  >
                    {t("kitchen.navAll")}
                  </Link>
                </div>
              ) : (
                aisleCarousels.map((row) => (
                  <KitchenAisleCarousel
                    key={row.key}
                    title={row.title}
                    seeMoreHref={row.seeMoreHref}
                    seeMoreLabel={row.seeMoreLabel}
                    products={row.products}
                  />
                ))
              )}
            </div>
          </PageContainer>
        </main>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { ProductImage } from "../components/ProductImage";
import { getKitchenAisleTitle } from "../i18n/useLocalizedProduct";
import { kitchenVisibleAisles } from "../data/kitchenWare";
import { useKitchenAisleShelves, useNearViewport } from "../hooks/useKitchenAisleShelf";
import { kitchenAislePath } from "../utils/kitchenMode";

const EAGER_TILES = 4;

export function KitchenCategoriesPage() {
  const { t } = useTranslation();

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
            {t("kitchen.catalogSub")}
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

        <div className="kitchen-cat-grid">
          {kitchenVisibleAisles().map((aisle, index) => (
            <KitchenCategoryTile key={aisle.id} aisleId={aisle.id} icon={aisle.icon} title={aisle.title} index={index} />
          ))}
        </div>
      </PageContainer>
    </div>
  );
}

function KitchenCategoryTile({
  aisleId,
  icon,
  title,
  index,
}: {
  aisleId: string;
  icon: string;
  title: string;
  index: number;
}) {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLAnchorElement>();
  const { shelves } = useKitchenAisleShelves([aisleId], index < EAGER_TILES || near);
  const cover = shelves[0]?.[0];
  const label = getKitchenAisleTitle(aisleId, t, title);

  return (
    <Link ref={ref} to={kitchenAislePath(aisleId)} className="kitchen-cat-tile">
      <div className="kitchen-cat-tile-media">
        {cover ? (
          <ProductImage
            src={cover.image}
            alt=""
            size="card"
            className="kitchen-cat-tile-image"
            priority={index < 4}
          />
        ) : (
          <span className="kitchen-cat-tile-fallback" aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <div className="kitchen-cat-tile-body">
        <strong>{label}</strong>
        <span>{t("kitchen.shopCategory")}</span>
      </div>
    </Link>
  );
}

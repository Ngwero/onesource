import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { KitchenAisleCarousel } from "../components/kitchen/KitchenAisleCarousel";
import { KitchenInspirationCollage } from "../components/kitchen/KitchenInspirationCollage";
import { KitchenShelfSkeleton } from "../components/kitchen/KitchenShelfSkeleton";
import { getKitchenAisleTitle } from "../i18n/useLocalizedProduct";
import {
  useKitchenAisleShelves,
  useNearViewport,
} from "../hooks/useKitchenAisleShelf";
import { KITCHEN_WARE_AISLES } from "../data/kitchenWare";
import { kitchenAislePath } from "../utils/kitchenMode";
import type { Product } from "../types/product";

/** Aisle shelves fetched straight away; the rest load as they near the viewport. */
const EAGER_SHELVES = 2;
/** The cross-aisle deals row sits after this many aisle shelves. */
const DEALS_AFTER = 2;
const DEALS_LIMIT = 24;

const ALL_AISLE_IDS = KITCHEN_WARE_AISLES.map((aisle) => aisle.id);

function isOnOffer(product: Product) {
  return product.originalPrice != null && product.originalPrice > product.price;
}

/** Round-robin across aisles so one big aisle doesn't fill the whole row. */
function interleaveOffers(shelves: Product[][], limit: number): Product[] {
  const pools = shelves.map((shelf) => shelf.filter(isOnOffer));
  const out: Product[] = [];
  for (let i = 0; out.length < limit; i += 1) {
    let added = false;
    for (const pool of pools) {
      if (i < pool.length) {
        out.push(pool[i]);
        added = true;
        if (out.length >= limit) break;
      }
    }
    if (!added) break;
  }
  return out;
}

function KitchenAisleShelf({
  aisleId,
  fallbackTitle,
  eager,
}: {
  aisleId: string;
  fallbackTitle: string;
  eager: boolean;
}) {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const { shelves, loading } = useKitchenAisleShelves([aisleId], eager || near);
  const products = shelves[0] ?? [];
  const title = getKitchenAisleTitle(aisleId, t, fallbackTitle);

  if (!loading && products.length === 0) return null;

  return (
    <div ref={ref}>
      {loading ? (
        <KitchenShelfSkeleton title={title} />
      ) : (
        <KitchenAisleCarousel
          title={title}
          seeMoreHref={kitchenAislePath(aisleId)}
          seeMoreLabel={t("categories.fresh.seeCategory", { category: title })}
          products={products}
        />
      )}
    </div>
  );
}

function KitchenDealsShelf() {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const { shelves, loading } = useKitchenAisleShelves(ALL_AISLE_IDS, near);
  const deals = useMemo(() => interleaveOffers(shelves, DEALS_LIMIT), [shelves]);
  const title = t("kitchen.home.dealsTitle");

  if (!loading && deals.length === 0) return null;

  return (
    <div ref={ref}>
      {loading ? (
        <KitchenShelfSkeleton title={title} />
      ) : (
        <KitchenAisleCarousel
          title={title}
          seeMoreHref="/kitchen/products?sale=1"
          seeMoreLabel={t("kitchen.home.dealsSeeAll")}
          products={deals}
          hideTabs
        />
      )}
    </div>
  );
}

export function KitchenShopPage() {
  return (
    <div className="categories-fresh-page kitchen-fresh-layout">
      <div className="categories-fresh-layout">
        <main className="categories-fresh-main">
          <PageContainer className="categories-fresh-container">
            <KitchenInspirationCollage />

            <div className="categories-fresh-carousels kitchen-ikea-rows">
              {KITCHEN_WARE_AISLES.map((aisle, index) => (
                <Fragment key={aisle.id}>
                  {index === DEALS_AFTER ? <KitchenDealsShelf /> : null}
                  <KitchenAisleShelf
                    aisleId={aisle.id}
                    fallbackTitle={aisle.title}
                    eager={index < EAGER_SHELVES}
                  />
                </Fragment>
              ))}
            </div>
          </PageContainer>
        </main>
      </div>
    </div>
  );
}
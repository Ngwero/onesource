import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { KitchenAisleCarousel } from "../components/kitchen/KitchenAisleCarousel";
import { KitchenIkeaProductCard } from "../components/kitchen/KitchenIkeaProductCard";
import { KitchenInspirationCollage } from "../components/kitchen/KitchenInspirationCollage";
import { KitchenShelfSkeleton } from "../components/kitchen/KitchenShelfSkeleton";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../components/InfiniteScrollFooter";
import { getKitchenAisleTitle } from "../i18n/useLocalizedProduct";
import {
  useKitchenAisleShelves,
  useNearViewport,
} from "../hooks/useKitchenAisleShelf";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";
import type { ProductListQuery } from "../api/client";
import { KITCHEN_WARE_AISLES } from "../data/kitchenWare";
import { kitchenAislePath } from "../utils/kitchenMode";
import type { Product } from "../types/product";

/** Aisle shelves fetched straight away; the rest load as they near the viewport. */
const EAGER_SHELVES = 2;
/** The cross-aisle deals row sits after this many aisle shelves. */
const DEALS_AFTER = 2;
const DEALS_LIMIT = 24;

const ALL_AISLE_IDS = KITCHEN_WARE_AISLES.map((aisle) => aisle.id);

const LATEST_QUERY: ProductListQuery = { shop: "kitchen", sort: "newest" };

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

/**
 * Every kitchen product, newest first. The first page is fetched on mount so it is ready
 * by the time the user scrolls past the shelves; later pages page in endlessly.
 */
function KitchenLatestFeed() {
  const { t } = useTranslation();
  const list = useInfiniteProducts(LATEST_QUERY);
  const { products } = list;
  const title = t("kitchen.home.latestTitle");

  if (!list.initialLoading && products.length === 0 && !list.hasMore && !list.error) {
    return null;
  }

  return (
    <section className="kitchen-ikea-row kitchen-latest-feed" aria-labelledby="kitchen-latest-title">
      <div className="kitchen-ikea-row-head">
        <h2 id="kitchen-latest-title" className="kitchen-ikea-row-title">
          {title}
        </h2>
      </div>
      <p className="kitchen-latest-feed-sub">{t("kitchen.home.latestSub")}</p>

      {list.initialLoading ? (
        <ProductGridSkeleton gridClassName="kitchen-home-grid" />
      ) : (
        <>
          <div className="kitchen-home-grid">
            {products.map((product) => (
              <KitchenIkeaProductCard key={product.id} product={product} />
            ))}
          </div>
          <InfiniteScrollFooter
            sentinelRef={list.sentinelRef}
            hasMore={list.hasMore}
            loading={list.loading}
            error={list.error}
            onRetry={list.retry}
            count={products.length}
          />
        </>
      )}
    </section>
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
              <KitchenLatestFeed />
            </div>
          </PageContainer>
        </main>
      </div>
    </div>
  );
}
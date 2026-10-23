import { KitchenPlatesCupsShelf } from "../components/kitchen/KitchenPlatesCupsShelf";
import { uniquePreviewProducts } from "../utils/uniquePreviewProducts";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  KITCHEN_HOME_CLAIM_KEYS,
  kitchenHomePackedAisles,
  kitchenHomePinnedAisles,
  kitchenVisibleAisles,
} from "../data/kitchenWare";
import { kitchenAislePath } from "../utils/kitchenMode";
import type { Product } from "../types/product";

const PINNED_AISLES = kitchenHomePinnedAisles();
const PACKED_AISLES = kitchenHomePackedAisles();
/** Aisle shelves fetched straight away; the rest load as they near the viewport. */
const EAGER_PINNED = PINNED_AISLES.length;
/** Packed aisles are well stocked; load them with the first screen so uniqueness can settle. */
const EAGER_PACKED = PACKED_AISLES.length;
const DEALS_LIMIT = 24;

const ALL_AISLE_IDS = kitchenVisibleAisles().map((aisle) => aisle.id);

const MIXED_QUERY: ProductListQuery = { shop: "kitchen", sort: "aisles" };

function samePreviewRow(a: Product[] | undefined, b: Product[]): boolean {
  if (a === b) return true;
  if (!a || a.length !== b.length) return false;
  return a.every((product, index) => product.id === b[index].id && product.image === b[index].image);
}

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
  featured,
  onClaim,
}: {
  aisleId: string;
  fallbackTitle: string;
  eager: boolean;
  featured: Product[];
  onClaim: (key: string, products: Product[]) => void;
}) {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const { shelves, loading } = useKitchenAisleShelves([aisleId], eager || near);
  const products = useMemo(
    () => uniquePreviewProducts(shelves[0] ?? [], featured),
    [shelves, featured],
  );
  const title = getKitchenAisleTitle(aisleId, t, fallbackTitle);

  useEffect(() => {
    if (loading) return;
    onClaim(aisleId, products);
  }, [aisleId, loading, onClaim, products]);

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

function KitchenDealsShelf({ featured }: { featured: Product[] }) {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const { shelves, loading } = useKitchenAisleShelves(ALL_AISLE_IDS, near);
  const deals = useMemo(
    () => uniquePreviewProducts(interleaveOffers(shelves, DEALS_LIMIT), featured),
    [shelves, featured],
  );
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

/** A varied feed drawn from every aisle, with distinct preview images. */
function KitchenMixedFeed({ featured }: { featured: Product[] }) {
  const { t } = useTranslation();
  const list = useInfiniteProducts(MIXED_QUERY);
  const products = uniquePreviewProducts(list.products, featured);
  const title = t("kitchen.home.latestTitle");

  if (!list.initialLoading && products.length === 0 && !list.hasMore && !list.error) {
    return null;
  }

  return (
    <section className="w-full min-w-0 kitchen-latest-feed" aria-labelledby="kitchen-latest-title">
      <div className="mb-3">
        <h2 id="kitchen-latest-title" className="section-title text-xl sm:text-2xl">
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
  const [claimedByKey, setClaimedByKey] = useState<Record<string, Product[]>>({});
  const onClaim = useCallback((key: string, products: Product[]) => {
    setClaimedByKey((prev) => {
      if (samePreviewRow(prev[key], products)) return prev;
      return { ...prev, [key]: products };
    });
  }, []);
  const excludeBefore = useCallback(
    (key: string) => {
      const out: Product[] = [];
      for (const id of KITCHEN_HOME_CLAIM_KEYS) {
        if (id === key) break;
        const row = claimedByKey[id];
        if (row?.length) out.push(...row);
      }
      return out;
    },
    [claimedByKey],
  );
  const allClaimed = useMemo(
    () => KITCHEN_HOME_CLAIM_KEYS.flatMap((key) => claimedByKey[key] ?? []),
    [claimedByKey],
  );

  return (
    <div className="kitchen-fresh-layout w-full pb-8 sm:pb-16">
      <PageContainer className="pt-4 sm:pt-6">
        <KitchenInspirationCollage />
      </PageContainer>

      <PageContainer className="mt-6 sm:mt-8 space-y-7 sm:space-y-9">
        {PINNED_AISLES.map((aisle, index) => (
          <KitchenAisleShelf
            key={aisle.id}
            aisleId={aisle.id}
            fallbackTitle={aisle.title}
            eager={index < EAGER_PINNED}
            featured={excludeBefore(aisle.id)}
            onClaim={onClaim}
          />
        ))}
        <KitchenPlatesCupsShelf exclude={excludeBefore("plates")} onClaim={onClaim} />
        {PACKED_AISLES.map((aisle, index) => (
          <KitchenAisleShelf
            key={aisle.id}
            aisleId={aisle.id}
            fallbackTitle={aisle.title}
            eager={index < EAGER_PACKED}
            featured={excludeBefore(aisle.id)}
            onClaim={onClaim}
          />
        ))}
        <KitchenDealsShelf featured={allClaimed} />
        <KitchenMixedFeed featured={allClaimed} />
      </PageContainer>
    </div>
  );
}

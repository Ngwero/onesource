import { uniquePreviewProducts } from "../utils/uniquePreviewProducts";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { CosmeticsProductCard } from "../components/cosmetics/CosmeticsProductCard";
import { CosmeticsHeroCarousel } from "../components/cosmetics/CosmeticsHeroCarousel";
import { CosmeticsCategoryMarquee } from "../components/cosmetics/CosmeticsCategoryMarquee";
import { ShopInfiniteHomeRow } from "../components/ShopInfiniteHomeRow";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../components/InfiniteScrollFooter";
import { useCosmeticsCatalog } from "../hooks/useCosmeticsCatalog";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";
import type { ProductListQuery } from "../api/client";
import { splitCosmeticTitle } from "../data/cosmeticBrands";
import { cosmeticsAislePath } from "../utils/cosmeticsMode";

const TOP_BRANDS = 14;

const MIXED_QUERY: ProductListQuery = { shop: "cosmetics", sort: "aisles" };
const OFFERS_ROW_QUERY: ProductListQuery = { shop: "cosmetics", sort: "aisles", sale: true };

export function CosmeticsShopPage() {
  const { t } = useTranslation();
  const { aisles, offers, settled } = useCosmeticsCatalog();

  const stocked = useMemo(
    () =>
      aisles
        .filter((aisle) => aisle.products.length > 0)
        .map((aisle) => ({
          ...aisle,
          label: t(`cosmetics.aisles.${aisle.id}`, { defaultValue: aisle.title }),
        })),
    [aisles, t]
  );

  const categoryTiles = useMemo(
    () =>
      stocked.map((aisle) => ({ id: aisle.id, label: aisle.label, image: aisle.products[0].image })),
    [stocked]
  );

  /** Brands behind the best sellers on this page (the full catalogue is too big to scan here). */
  const topBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of [...offers, ...aisles.flatMap((aisle) => aisle.products)]) {
      const { brand } = splitCosmeticTitle(p.title);
      if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_BRANDS)
      .map(([brand]) => brand);
  }, [aisles, offers]);

  return (
    <div className="cos-page w-full pb-8 sm:pb-16">
      <PageContainer className="pt-4 sm:pt-6">
        <CosmeticsHeroCarousel />
      </PageContainer>

      {(categoryTiles.length > 0 || topBrands.length > 0) && (
        <PageContainer className="mt-4 sm:mt-6 space-y-7 sm:space-y-9">
          {categoryTiles.length > 0 && (
            <section>
              <h2 className="section-title text-xl sm:text-2xl">{t("cosmetics.shopByCategory")}</h2>
              <div className="mt-3">
                <CosmeticsCategoryMarquee tiles={categoryTiles} />
              </div>
            </section>
          )}

          {topBrands.length > 0 && (
            <section>
              <h2 className="section-title text-xl sm:text-2xl">{t("cosmetics.topBrands")}</h2>
              <div className="cos-brands">
                {topBrands.map((brand) => (
                  <Link
                    key={brand}
                    to={`/cosmetics/products?brand=${encodeURIComponent(brand)}`}
                    className="cos-brand-chip"
                  >
                    {brand}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </PageContainer>
      )}

      <PageContainer className="mt-6 sm:mt-8 space-y-7 sm:space-y-9">
        {offers.length > 0 && (
          <ShopInfiniteHomeRow
            title={t("kitchen.home.feedOffers")}
            products={offers}
            query={OFFERS_ROW_QUERY}
            seeAllTo="/cosmetics/products?sale=1"
          />
        )}

        {stocked.map((aisle) => (
          <ShopInfiniteHomeRow
            key={aisle.id}
            title={aisle.label}
            products={aisle.products}
            query={{ shop: "cosmetics", sort: "aisles", aisle: aisle.id }}
            seeAllTo={cosmeticsAislePath(aisle.id)}
          />
        ))}

        {settled && stocked.length === 0 && offers.length === 0 && (
          <p className="cos-empty">{t("cosmetics.empty")}</p>
        )}

        <CosmeticsMixedFeed />
      </PageContainer>
    </div>
  );
}

/** A varied feed drawn from every aisle, with distinct preview images. */
function CosmeticsMixedFeed() {
  const { t } = useTranslation();
  const list = useInfiniteProducts(MIXED_QUERY);
  const products = uniquePreviewProducts(list.products);

  if (!list.initialLoading && products.length === 0 && !list.hasMore && !list.error) {
    return null;
  }

  return (
    <section className="w-full min-w-0 cos-latest-feed" aria-labelledby="cos-latest-title">
      <div className="mb-3">
        <h2 id="cos-latest-title" className="section-title text-xl sm:text-2xl">
          {t("cosmetics.home.latestTitle")}
        </h2>
      </div>
      <p className="cos-latest-feed-sub">{t("cosmetics.home.latestSub")}</p>

      {list.initialLoading ? (
        <ProductGridSkeleton gridClassName="cos-grid" cards={10} />
      ) : (
        <>
          <div className="cos-grid">
            {products.map((product) => (
              <CosmeticsProductCard key={product.id} product={product} />
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

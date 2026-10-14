import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { ProductImage } from "../components/ProductImage";
import { CosmeticsProductCard } from "../components/cosmetics/CosmeticsProductCard";
import { CosmeticsHeroCarousel } from "../components/cosmetics/CosmeticsHeroCarousel";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../components/InfiniteScrollFooter";
import { useCosmeticsCatalog } from "../hooks/useCosmeticsCatalog";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";
import { useInfiniteRow } from "../hooks/useInfiniteRow";
import { useNearViewport } from "../hooks/useKitchenAisleShelf";
import type { ProductListQuery } from "../api/client";
import { cosmeticsAislePath } from "../utils/cosmeticsMode";
import { splitCosmeticTitle } from "../data/cosmeticBrands";
import type { Product } from "../types/product";

const TOP_BRANDS = 14;

const LATEST_QUERY: ProductListQuery = { shop: "cosmetics", sort: "newest" };
const OFFERS_ROW_QUERY: ProductListQuery = { shop: "cosmetics", sort: "top", sale: true };

export function CosmeticsShopPage() {
  const { t } = useTranslation();
  const { aisles, offers, loading } = useCosmeticsCatalog();

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
    <div className="cos-page">
      <PageContainer className="cos-shell">
        <CosmeticsHeroCarousel />

        {loading ? (
          <p className="cos-empty">{t("common.loading")}</p>
        ) : stocked.length === 0 ? (
          <p className="cos-empty">{t("cosmetics.empty")}</p>
        ) : (
          <>
            <section className="cos-section">
              <h2 className="cos-section-title">{t("cosmetics.shopByCategory")}</h2>
              <div className="cos-circles">
                {stocked.map((aisle, index) => (
                  <Link key={aisle.id} to={cosmeticsAislePath(aisle.id)} className="cos-circle">
                    <span className="cos-circle-media">
                      <ProductImage
                        src={aisle.products[0].image}
                        alt=""
                        size="thumb"
                        priority={index < 8}
                      />
                    </span>
                    <span className="cos-circle-label">{aisle.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {topBrands.length > 0 && (
              <section className="cos-section">
                <h2 className="cos-section-title">{t("cosmetics.topBrands")}</h2>
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

            {offers.length > 0 && (
              <ProductRow
                title={t("kitchen.home.feedOffers")}
                products={offers}
                query={OFFERS_ROW_QUERY}
              />
            )}

            {stocked.map((aisle) => (
              <ProductRow
                key={aisle.id}
                title={aisle.label}
                products={aisle.products}
                query={{ shop: "cosmetics", sort: "top", aisle: aisle.id }}
              />
            ))}

            <CosmeticsLatestFeed />
          </>
        )}
      </PageContainer>
    </div>
  );
}

/** Best sellers of one aisle (or the offers) that keep paging in as the user scrolls the row sideways. */
function ProductRow({
  title,
  products: seed,
  query,
}: {
  title: string;
  products: Product[];
  query: ProductListQuery;
}) {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLElement>();
  const { products, hasMore, loading, error, loadMore, scrollerRef, sentinelRef } = useInfiniteRow(
    query,
    seed,
    { active: near }
  );
  const scrollerEl = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const setScroller = useCallback(
    (el: HTMLDivElement | null) => {
      scrollerEl.current = el;
      scrollerRef(el);
    },
    [scrollerRef]
  );

  const updateEdges = useCallback(() => {
    const el = scrollerEl.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    updateEdges();
  }, [products.length, updateEdges]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = scrollerEl.current;
    if (!el) return;
    if (dir === 1 && el.scrollLeft + el.clientWidth * 2 >= el.scrollWidth) loadMore();
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <section ref={ref} className="cos-section cos-section--grid">
      <h2 className="cos-grid-title">
        {title}
      </h2>
      <div className="cos-hrow-wrap">
        <button
          type="button"
          className="cos-hrow-arrow cos-hrow-arrow--prev"
          aria-label={t("categories.fresh.scrollPrev")}
          disabled={edges.start}
          onClick={() => scrollByPage(-1)}
        >
          ‹
        </button>
        <div ref={setScroller} className="cos-hrow" onScroll={updateEdges}>
          {products.map((product) => (
            <div key={product.id} className="cos-hrow-item">
              <CosmeticsProductCard product={product} />
            </div>
          ))}
          {error ? (
            <div className="cos-hrow-item cos-hrow-retry">
              <p>{t("listing.loadError")}</p>
              <button type="button" onClick={loadMore}>
                {t("common.retry")}
              </button>
            </div>
          ) : (
            loading &&
            Array.from({ length: 3 }, (_, i) => (
              <div key={`skeleton-${i}`} className="cos-hrow-item cos-hrow-skeleton" aria-hidden>
                <span className="kitchen-shelf-skeleton-media" />
                <span className="kitchen-shelf-skeleton-line" />
                <span className="kitchen-shelf-skeleton-line kitchen-shelf-skeleton-line--short" />
              </div>
            ))
          )}
          {hasMore && <span ref={sentinelRef} className="cos-hrow-sentinel" aria-hidden />}
        </div>
        <button
          type="button"
          className="cos-hrow-arrow cos-hrow-arrow--next"
          aria-label={t("categories.fresh.scrollNext")}
          disabled={edges.end && !hasMore}
          onClick={() => scrollByPage(1)}
        >
          ›
        </button>
      </div>
    </section>
  );
}

/** Every cosmetics product, newest first, paging in endlessly once the user scrolls down to it. */
function CosmeticsLatestFeed() {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLElement>();
  const list = useInfiniteProducts(near ? LATEST_QUERY : null);
  const { products } = list;

  if (near && !list.initialLoading && products.length === 0 && !list.hasMore && !list.error) {
    return null;
  }

  return (
    <section
      ref={ref}
      className="cos-section cos-section--grid cos-latest-feed"
      aria-labelledby="cos-latest-title"
    >
      <h2 id="cos-latest-title" className="cos-grid-title">
        {t("cosmetics.home.latestTitle")}
      </h2>
      <p className="cos-latest-feed-sub">{t("cosmetics.home.latestSub")}</p>

      {!near || list.initialLoading ? (
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

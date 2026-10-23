import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PharmacyHero } from "../components/pharmacy/PharmacyHero";
import { PageContainer } from "../components/PageContainer";
import { ProductCard } from "../components/ProductCard";
import { useInfiniteRow } from "../hooks/useInfiniteRow";
import { useNearViewport } from "../hooks/useKitchenAisleShelf";
import { usePharmacyCatalog } from "../hooks/usePharmacyCatalog";
import type { ProductListQuery } from "../api/client";
import type { Product } from "../types/product";

const OFFERS_ROW_QUERY: ProductListQuery = { shop: "pharmacy", sort: "top", sale: true };

export function PharmacyShopPage() {
  const { t } = useTranslation();
  const { aisles, offers } = usePharmacyCatalog();

  const stocked = useMemo(
    () =>
      aisles
        .filter((aisle) => aisle.products.length > 0)
        .map((aisle) => ({
          ...aisle,
          label: `${aisle.icon} ${t(`pharmacy.aisles.${aisle.id}`, { defaultValue: aisle.title })}`,
        })),
    [aisles, t]
  );

  return (
    <div className="cos-page pharm-photos pharmacy-home">
      <PageContainer className="cos-shell">
        <PharmacyHero />

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
            query={{ shop: "pharmacy", sort: "top", aisle: aisle.id }}
          />
        ))}
      </PageContainer>
    </div>
  );
}

/** One aisle (or the offers) that keeps paging in as the row is scrolled sideways. */
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
      <h2 className="cos-grid-title">{title}</h2>
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
              <ProductCard product={product} />
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

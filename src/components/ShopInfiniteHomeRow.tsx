import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ProductListQuery } from "../api/client";
import { useInfiniteRow } from "../hooks/useInfiniteRow";
import { useNearViewport } from "../hooks/useKitchenAisleShelf";
import type { Product } from "../types/product";
import { ShopHomeProductRow } from "./ShopHomeProductRow";

type Props = {
  title: string;
  products: Product[];
  query: ProductListQuery;
  seeAllTo?: string;
};

/** Fresh-style title + product row that pages in more items as it is scrolled. */
export function ShopInfiniteHomeRow({
  title,
  products: seed,
  query,
  seeAllTo,
}: Props) {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const { products, hasMore, loading, error, loadMore, scrollerRef, sentinelRef } = useInfiniteRow(
    query,
    seed,
    { active: near },
  );
  const scrollerEl = useRef<HTMLDivElement | null>(null);

  const setScroller = useCallback(
    (el: HTMLDivElement | null) => {
      scrollerEl.current = el;
      scrollerRef(el);
    },
    [scrollerRef],
  );

  const onScrollNext = () => {
    const el = scrollerEl.current;
    if (!el) return;
    if (el.scrollLeft + el.clientWidth * 2 >= el.scrollWidth) loadMore();
  };

  const extra =
    error || loading || hasMore ? (
      <>
        {error ? (
          <div className="home-product-row-item home-product-row-retry">
            <p>{t("listing.loadError")}</p>
            <button type="button" onClick={loadMore}>
              {t("common.retry")}
            </button>
          </div>
        ) : (
          loading &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={`skeleton-${i}`} className="home-product-row-item" aria-hidden>
              <span className="kitchen-shelf-skeleton-media" />
              <span className="kitchen-shelf-skeleton-line" />
              <span className="kitchen-shelf-skeleton-line kitchen-shelf-skeleton-line--short" />
            </div>
          ))
        )}
        {hasMore && <span ref={sentinelRef} className="home-product-row-sentinel" aria-hidden />}
      </>
    ) : null;

  return (
    <div ref={ref}>
      <ShopHomeProductRow
        title={title}
        products={products}
        seeAllTo={seeAllTo}
        extra={extra}
        trackRef={setScroller}
        onScrollNext={onScrollNext}
        hasMore={hasMore}
      />
    </div>
  );
}

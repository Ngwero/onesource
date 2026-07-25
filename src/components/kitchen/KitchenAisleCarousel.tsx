import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { KitchenIkeaProductCard } from "./KitchenIkeaProductCard";
import { useAutoScrollByItems } from "../../hooks/useAutoScrollByItems";

type FeedTab = "bestsellers" | "offers";

type Props = {
  title: string;
  seeMoreHref: string;
  seeMoreLabel?: string;
  products: Product[];
};

function sortBestSellers(products: Product[]) {
  return [...products].sort(
    (a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount
  );
}

export function KitchenAisleCarousel({
  title,
  seeMoreHref,
  seeMoreLabel,
  products,
}: Props) {
  const { t } = useTranslation();
  const hoverRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [feedTab, setFeedTab] = useState<FeedTab>("bestsellers");
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const feedProducts = useMemo(() => {
    if (feedTab === "offers") {
      return sortBestSellers(
        products.filter(
          (p) => p.originalPrice != null && p.originalPrice > p.price
        )
      );
    }
    return sortBestSellers(products);
  }, [products, feedTab]);

  useAutoScrollByItems(trackRef, feedProducts.length, {
    pauseRootRef: hoverRef,
    itemSelector: ".kitchen-ikea-row-item",
    itemsPerStep: 2,
    intervalMs: 4800,
    minItems: 4,
  });

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const prev = el.scrollLeft > 8;
    const next = el.scrollLeft < el.scrollWidth - el.clientWidth - 8;
    setCanPrev((v) => (v === prev ? v : prev));
    setCanNext((v) => (v === next ? v : next));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    updateArrows();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateArrows();
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [feedProducts.length, feedTab, updateArrows]);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const item = el.querySelector(".kitchen-ikea-row-item") as HTMLElement | null;
    const style = getComputedStyle(el);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
    const step = item ? (item.offsetWidth + gap) * 2 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  const hasOffers = products.some(
    (p) => p.originalPrice != null && p.originalPrice > p.price
  );

  return (
    <section
      ref={hoverRef}
      className="kitchen-ikea-row"
      aria-labelledby={`kitchen-row-${title}`}
    >
      <div className="kitchen-ikea-row-head">
        <h2 id={`kitchen-row-${title}`} className="kitchen-ikea-row-title">
          {title}
        </h2>
        <Link to={seeMoreHref} className="kitchen-ikea-row-more">
          {seeMoreLabel ?? t("categories.fresh.seeMore")} ›
        </Link>
      </div>

      <nav className="kitchen-ikea-row-tabs" aria-label={t("kitchen.home.feedLabel")}>
        <button
          type="button"
          className={`kitchen-ikea-row-tab${feedTab === "bestsellers" ? " is-active" : ""}`}
          onClick={() => setFeedTab("bestsellers")}
        >
          {t("kitchen.home.feedBest")}
        </button>
        <button
          type="button"
          className={`kitchen-ikea-row-tab${feedTab === "offers" ? " is-active" : ""}`}
          onClick={() => setFeedTab("offers")}
          disabled={!hasOffers}
        >
          {t("kitchen.home.feedOffers")}
        </button>
      </nav>

      {feedProducts.length === 0 ? (
        <p className="kitchen-ikea-empty">{t("kitchen.noFilterResults")}</p>
      ) : (
        <div className="kitchen-ikea-row-body">
          <button
            type="button"
            className="kitchen-ikea-row-arrow kitchen-ikea-row-arrow--prev"
            onClick={() => scroll(-1)}
            disabled={!canPrev}
            aria-label={t("categories.fresh.scrollPrev")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div ref={trackRef} className="kitchen-ikea-row-track" role="list">
            {feedProducts.map((product, index) => (
              <div
                key={product.id}
                className="kitchen-ikea-row-item"
                role="listitem"
              >
                <KitchenIkeaProductCard
                  product={product}
                  priority={index < 6}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="kitchen-ikea-row-arrow kitchen-ikea-row-arrow--next"
            onClick={() => scroll(1)}
            disabled={!canNext}
            aria-label={t("categories.fresh.scrollNext")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}

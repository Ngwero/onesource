import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
import { ScrollReveal } from "./ScrollReveal";
import { Section } from "./Section";
import { useAutoScrollByItems } from "../hooks/useAutoScrollByItems";
import { bindHorizontalScroll } from "../utils/horizontalScroll";

type Props = {
  title: string;
  products: Product[];
  seeAllTo?: string;
  /** Extra nodes inside the track (skeletons, retry, infinite-scroll sentinel). */
  extra?: ReactNode;
  trackRef?: (el: HTMLDivElement | null) => void;
  onTrackScroll?: () => void;
  /** Called when the next arrow is used, so infinite rows can page in. */
  onScrollNext?: () => void;
  /** Keep the next arrow enabled while more products can still load. */
  hasMore?: boolean;
};

export function ShopHomeProductRow({
  title,
  products,
  seeAllTo,
  extra,
  trackRef: trackRefProp,
  onTrackScroll,
  onScrollNext,
  hasMore = false,
}: Props) {
  const { t } = useTranslation();
  const hoverRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const setTrack = useCallback(
    (el: HTMLDivElement | null) => {
      trackRef.current = el;
      trackRefProp?.(el);
    },
    [trackRefProp],
  );

  useAutoScrollByItems(trackRef, products.length, {
    pauseRootRef: hoverRef,
    itemSelector: ".home-product-row-item",
    itemsPerStep: 2,
    intervalMs: 5500,
    minItems: 4,
    pauseOnInteractMs: 12_000,
  });

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const prev = el.scrollLeft > 4;
    const next = max > 4 && el.scrollLeft < max - 4;
    setCanPrev((v) => (v === prev ? v : prev));
    setCanNext((v) => (v === next ? v : next));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    updateArrows();

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateArrows();
        onTrackScroll?.();
      });
    };

    const unbindHorizontalScroll = bindHorizontalScroll(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      unbindHorizontalScroll();
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      el.classList.remove("is-dragging");
    };
  }, [products.length, updateArrows, onTrackScroll]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    if (dir === 1) onScrollNext?.();
    const item = el.querySelector(".home-product-row-item") as HTMLElement | null;
    const style = getComputedStyle(el);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
    const step = item ? (item.offsetWidth + gap) * 2 : Math.max(el.clientWidth * 0.8, 200);
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + dir * step));
  };

  if (products.length === 0 && !extra) return null;

  return (
    <ScrollReveal variant="fade-up" className="w-full min-w-0">
      <div ref={hoverRef} className="home-product-row-hover-zone w-full min-w-0">
        <Section
          title={title}
          action={
            seeAllTo ? (
              <Link
                to={seeAllTo}
                className="text-sm font-semibold text-accent hover:underline whitespace-nowrap"
              >
                {t("home.rows.seeAll")} →
              </Link>
            ) : undefined
          }
          className="home-product-row-section"
          plain
        >
          <div className="home-product-row-body">
            <button
              type="button"
              className="home-product-row-arrow home-product-row-arrow--prev"
              onClick={() => scrollByDir(-1)}
              disabled={!canPrev}
              aria-label={t("home.rows.scrollPrev", { defaultValue: "Scroll left" })}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div ref={setTrack} className="home-product-row" role="list">
              {products.map((product) => (
                <div key={product.id} className="home-product-row-item" role="listitem">
                  <ProductCard product={product} />
                </div>
              ))}
              {extra}
            </div>

            <button
              type="button"
              className="home-product-row-arrow home-product-row-arrow--next"
              onClick={() => scrollByDir(1)}
              disabled={!canNext && !hasMore}
              aria-label={t("home.rows.scrollNext", { defaultValue: "Scroll right" })}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </Section>
      </div>
    </ScrollReveal>
  );
}

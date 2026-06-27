import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { FreshAisleProductCard } from "./FreshAisleProductCard";
import { useAutoScrollByItems } from "../../hooks/useAutoScrollByItems";

type Props = {
  title: string;
  badge?: string;
  seeMoreHref: string;
  seeMoreLabel?: string;
  products: Product[];
};

export function CategoriesAisleCarousel({
  title,
  badge,
  seeMoreHref,
  seeMoreLabel,
  products,
}: Props) {
  const { t } = useTranslation();
  const hoverRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useAutoScrollByItems(trackRef, products.length, {
    pauseRootRef: hoverRef,
    itemSelector: ".fresh-aisle-carousel-item",
    itemsPerStep: 2,
    intervalMs: 4500,
    minItems: 3,
  });

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [products.length, updateArrows]);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const item = el.querySelector(".fresh-aisle-carousel-item") as HTMLElement | null;
    const style = getComputedStyle(el);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
    const step = item ? (item.offsetWidth + gap) * 2 : el.clientWidth * 0.92;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section
      ref={hoverRef}
      className="fresh-aisle-carousel"
      aria-labelledby={`aisle-${title}`}
    >
      <div className="fresh-aisle-carousel-head">
        <h2 id={`aisle-${title}`} className="fresh-aisle-carousel-title">
          {title}
          {badge ? <span className="fresh-aisle-carousel-badge">{badge}</span> : null}
        </h2>
        <Link to={seeMoreHref} className="fresh-aisle-carousel-more">
          {seeMoreLabel ?? t("categories.fresh.seeMore")} ›
        </Link>
      </div>

      <div className="fresh-aisle-carousel-body">
        <button
          type="button"
          className="fresh-aisle-carousel-arrow fresh-aisle-carousel-arrow--prev"
          onClick={() => scroll(-1)}
          disabled={!canPrev}
          aria-label={t("categories.fresh.scrollPrev")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div ref={trackRef} className="fresh-aisle-carousel-track" role="list">
          {products.map((product) => (
            <div key={product.id} className="fresh-aisle-carousel-item" role="listitem">
              <FreshAisleProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="fresh-aisle-carousel-arrow fresh-aisle-carousel-arrow--next"
          onClick={() => scroll(1)}
          disabled={!canNext}
          aria-label={t("categories.fresh.scrollNext")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}

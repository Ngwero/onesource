import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
import { ScrollReveal } from "./ScrollReveal";
import { Section } from "./Section";
import { useAutoScrollByItems } from "../hooks/useAutoScrollByItems";

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
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startScroll: number;
    pointerId: number | null;
  }>({ active: false, moved: false, startX: 0, startScroll: 0, pointerId: null });

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

    const onWheel = (e: WheelEvent) => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;

      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.shiftKey) return;

      const delta = e.deltaY;
      if (delta === 0) return;

      const next = el.scrollLeft + delta;
      const clamped = Math.max(0, Math.min(max, next));
      if (clamped === el.scrollLeft) return;

      e.preventDefault();
      el.scrollLeft = clamped;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea")) {
        if (target.closest("button, input, select, textarea")) return;
      }

      dragRef.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startScroll: el.scrollLeft,
        pointerId: e.pointerId,
      };
      el.classList.add("is-dragging");
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) < 6) return;
      drag.moved = true;
      e.preventDefault();
      el.scrollLeft = drag.startScroll - dx;
    };

    const endDrag = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== e.pointerId) return;
      const wasMoved = drag.moved;
      drag.active = false;
      drag.pointerId = null;
      el.classList.remove("is-dragging");
      if (wasMoved) {
        const suppress = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        el.addEventListener("click", suppress, true);
        window.setTimeout(() => el.removeEventListener("click", suppress, true), 0);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
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
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (products.length === 0 && !extra) return null;

  return (
    <ScrollReveal variant="fade-up">
      <div ref={hoverRef} className="home-product-row-hover-zone">
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

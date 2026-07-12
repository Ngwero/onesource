import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import type { HomeRowConfig } from "../data/homeRows";
import { ProductCard } from "../components/ProductCard";
import { ScrollReveal } from "./ScrollReveal";
import { Section } from "./Section";
import { useAutoScrollByItems } from "../hooks/useAutoScrollByItems";

type Props = {
  row: HomeRowConfig;
  products: Product[];
};

export function HomeProductRow({ row, products }: Props) {
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
      });
    };

    const onWheel = (e: WheelEvent) => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;

      // Native trackpad horizontal — let the browser handle it.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // Shift+wheel already maps to horizontal in most browsers.
      if (e.shiftKey) return;

      const delta = e.deltaY;
      if (delta === 0) return;

      const next = el.scrollLeft + delta;
      const clamped = Math.max(0, Math.min(max, next));
      // Only take over when we can still move sideways.
      if (clamped === el.scrollLeft) return;

      e.preventDefault();
      el.scrollLeft = clamped;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // native touch pan
      if (e.button !== 0) return;
      // Don't start drag from interactive controls.
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea")) {
        // Still allow drag from the card link area — only skip real buttons.
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
        // Suppress the click that follows a drag.
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
  }, [products.length, updateArrows]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const item = el.querySelector(".home-product-row-item") as HTMLElement | null;
    const style = getComputedStyle(el);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
    const step = item ? (item.offsetWidth + gap) * 2 : Math.max(el.clientWidth * 0.8, 200);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  const seeAllTo = row.seeAllHref
    ? row.seeAllHref
    : row.seeAllCategoryId
      ? `/category/${row.seeAllCategoryId}`
      : `/search?q=${encodeURIComponent(row.seeAllSearch ?? "")}`;

  return (
    <ScrollReveal variant="fade-up">
      <div ref={hoverRef} className="home-product-row-hover-zone">
        <Section
          title={t(row.titleKey)}
          subtitle={t(row.subtitleKey)}
          action={
            <Link
              to={seeAllTo}
              className="text-sm font-semibold text-accent hover:underline whitespace-nowrap"
            >
              {t("home.rows.seeAll")} →
            </Link>
          }
          className="home-product-row-section"
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

            <div ref={trackRef} className="home-product-row" role="list">
              {products.map((product) => (
                <div key={product.id} className="home-product-row-item" role="listitem">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="home-product-row-arrow home-product-row-arrow--next"
              onClick={() => scrollByDir(1)}
              disabled={!canNext}
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

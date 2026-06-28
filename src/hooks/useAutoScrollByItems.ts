import { useEffect, type RefObject } from "react";

type Options = {
  itemsPerStep?: number;
  intervalMs?: number;
  itemSelector: string;
  minItems?: number;
  /** Wider hover zone (whole row section). Defaults to the scroll track. */
  pauseRootRef?: RefObject<HTMLElement | null>;
};

function isHovered(root: HTMLElement | null) {
  return Boolean(root?.matches(":hover"));
}

export function useAutoScrollByItems(
  trackRef: RefObject<HTMLElement | null>,
  itemCount: number,
  {
    itemsPerStep = 2,
    intervalMs = 4000,
    itemSelector,
    minItems = 3,
    pauseRootRef,
  }: Options
) {
  useEffect(() => {
    const el = trackRef.current;
    if (!el || itemCount < minItems) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const hoverRoot = () => pauseRootRef?.current ?? el;

    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;
    let cachedStep = 0;

    const measureStep = () => {
      const item = el.querySelector(itemSelector) as HTMLElement | null;
      if (!item) {
        cachedStep = el.clientWidth * 0.5;
        return;
      }
      const style = getComputedStyle(el);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      cachedStep = (item.offsetWidth + gap) * itemsPerStep;
    };

    measureStep();
    const ro = new ResizeObserver(measureStep);
    ro.observe(el);

    const pause = () => {
      paused = true;
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
    };

    const tryResume = () => {
      if (isHovered(hoverRoot())) return;
      paused = false;
    };

    const pauseBriefly = () => {
      pause();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        tryResume();
      }, intervalMs * 2);
    };

    const onUserScroll = () => {
      pause();
      if (scrollEndTimer) clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => {
        scrollEndTimer = null;
        tryResume();
      }, 180);
    };

    const scrollNext = () => {
      if (paused || isHovered(hoverRoot())) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const step = cachedStep || el.clientWidth * 0.5;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += step;
      }
    };

    const timer = window.setInterval(scrollNext, intervalMs);

    const root = hoverRoot();
    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", tryResume);
    el.addEventListener("scroll", onUserScroll, { passive: true });
    el.addEventListener("touchstart", pauseBriefly, { passive: true });
    el.addEventListener("pointerdown", pauseBriefly);
    el.addEventListener("wheel", pauseBriefly, { passive: true });
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", tryResume);

    if ("onscrollend" in el) {
      el.addEventListener("scrollend", tryResume);
    }

    return () => {
      window.clearInterval(timer);
      ro.disconnect();
      if (resumeTimer) clearTimeout(resumeTimer);
      if (scrollEndTimer) clearTimeout(scrollEndTimer);
      root.removeEventListener("mouseenter", pause);
      root.removeEventListener("mouseleave", tryResume);
      el.removeEventListener("scroll", onUserScroll);
      el.removeEventListener("touchstart", pauseBriefly);
      el.removeEventListener("pointerdown", pauseBriefly);
      el.removeEventListener("wheel", pauseBriefly);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", tryResume);
      if ("onscrollend" in el) {
        el.removeEventListener("scrollend", tryResume);
      }
    };
  }, [trackRef, pauseRootRef, itemCount, itemsPerStep, intervalMs, itemSelector, minItems]);
}

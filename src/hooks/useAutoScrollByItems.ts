import { useEffect, type RefObject } from "react";

type Options = {
  itemsPerStep?: number;
  intervalMs?: number;
  itemSelector: string;
  minItems?: number;
  /** Wider hover zone (whole row section). Defaults to the scroll track. */
  pauseRootRef?: RefObject<HTMLElement | null>;
  /** How long to keep auto-scroll paused after user interaction. */
  pauseOnInteractMs?: number;
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
    pauseOnInteractMs,
  }: Options
) {
  useEffect(() => {
    const el = trackRef.current;
    if (!el || itemCount < minItems) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const interactPauseMs = pauseOnInteractMs ?? intervalMs * 3;
    const hoverRoot = () => pauseRootRef?.current ?? el;

    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
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
      if (el.classList.contains("is-dragging")) return;
      paused = false;
    };

    const pauseBriefly = () => {
      pause();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        tryResume();
      }, interactPauseMs);
    };

    const scrollNext = () => {
      if (paused || isHovered(hoverRoot()) || el.classList.contains("is-dragging")) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 4) return;

      const step = cachedStep || el.clientWidth * 0.5;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "auto" });
      } else {
        el.scrollBy({ left: step, behavior: "auto" });
      }
    };

    const timer = window.setInterval(scrollNext, intervalMs);

    const root = hoverRoot();
    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", tryResume);
    el.addEventListener("scroll", pauseBriefly, { passive: true });
    el.addEventListener("touchstart", pauseBriefly, { passive: true });
    el.addEventListener("pointerdown", pauseBriefly);
    el.addEventListener("wheel", pauseBriefly, { passive: true });
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", tryResume);

    return () => {
      window.clearInterval(timer);
      ro.disconnect();
      if (resumeTimer) clearTimeout(resumeTimer);
      root.removeEventListener("mouseenter", pause);
      root.removeEventListener("mouseleave", tryResume);
      el.removeEventListener("scroll", pauseBriefly);
      el.removeEventListener("touchstart", pauseBriefly);
      el.removeEventListener("pointerdown", pauseBriefly);
      el.removeEventListener("wheel", pauseBriefly);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", tryResume);
    };
  }, [
    trackRef,
    pauseRootRef,
    itemCount,
    itemsPerStep,
    intervalMs,
    itemSelector,
    minItems,
    pauseOnInteractMs,
  ]);
}

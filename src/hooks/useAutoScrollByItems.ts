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

    const getStep = () => {
      const item = el.querySelector(itemSelector) as HTMLElement | null;
      if (!item) return el.clientWidth * 0.5;
      const style = getComputedStyle(el);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      return (item.offsetWidth + gap) * itemsPerStep;
    };

    const stopInFlightScroll = () => {
      const current = el.scrollLeft;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = current;
      el.style.scrollBehavior = "";
    };

    const scrollNext = () => {
      if (paused || isHovered(hoverRoot())) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const step = getStep();
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    };

    const tryResume = () => {
      if (isHovered(hoverRoot())) return;
      paused = false;
    };

    const pause = () => {
      paused = true;
      stopInFlightScroll();
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
    };

    const pauseBriefly = () => {
      pause();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        tryResume();
      }, intervalMs * 2);
    };

    const onHoverEnter = () => pause();
    const onHoverLeave = () => tryResume();

    const timer = window.setInterval(scrollNext, intervalMs);

    const root = hoverRoot();
    root.addEventListener("mouseenter", onHoverEnter);
    root.addEventListener("mouseleave", onHoverLeave);
    el.addEventListener("touchstart", pauseBriefly, { passive: true });
    el.addEventListener("pointerdown", pauseBriefly);
    el.addEventListener("wheel", pauseBriefly, { passive: true });
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", tryResume);

    return () => {
      window.clearInterval(timer);
      if (resumeTimer) clearTimeout(resumeTimer);
      root.removeEventListener("mouseenter", onHoverEnter);
      root.removeEventListener("mouseleave", onHoverLeave);
      el.removeEventListener("touchstart", pauseBriefly);
      el.removeEventListener("pointerdown", pauseBriefly);
      el.removeEventListener("wheel", pauseBriefly);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", tryResume);
    };
  }, [trackRef, pauseRootRef, itemCount, itemsPerStep, intervalMs, itemSelector, minItems]);
}

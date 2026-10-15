import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  ZOOM_DOUBLE,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_RUBBER_MIN,
  clamp,
  clampView,
  zoomAt,
  type Box,
  type View,
} from "./imageZoomMath";

const IDENTITY: View = { scale: 1, tx: 0, ty: 0 };
const DOUBLE_MS = 280;
const TAP_DELAY_MS = 300;
const SWIPE_PX = 56;

type Options = {
  /** When false, gestures are ignored and the view stays at 1×. */
  enabled: boolean;
  /** Modal captures every pointer. Inline lets a one-finger drag scroll the page until zoomed. */
  capture: "modal" | "inline";
  /** Wheel zoom. Lightbox only — the product page should still scroll. */
  wheel?: boolean;
  onTap?: () => void;
  onSwipe?: (direction: 1 | -1) => void;
  resetKey?: string;
};

function readBox(img: HTMLImageElement, view: View): Box {
  const rect = img.getBoundingClientRect();
  const width = img.offsetWidth || rect.width;
  const height = img.offsetHeight || rect.height;
  const cx = rect.left + rect.width / 2 - view.tx;
  const cy = rect.top + rect.height / 2 - view.ty;
  return { width, height, left: cx - width / 2, top: cy - height / 2 };
}

function focalOf(clientX: number, clientY: number, box: Box) {
  return {
    x: clientX - (box.left + box.width / 2),
    y: clientY - (box.top + box.height / 2),
  };
}

export function usePointerImageZoom(
  imgRef: RefObject<HTMLImageElement | null>,
  { enabled, capture, wheel = false, onTap, onSwipe, resetKey = "" }: Options
) {
  const viewRef = useRef<View>(IDENTITY);
  const [view, setView] = useState<View>(IDENTITY);
  const [panning, setPanning] = useState(false);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { type: "pinch"; dist: number; scale: number; tx: number; ty: number; midX: number; midY: number }
    | { type: "pan"; x: number; y: number; tx: number; ty: number }
    | { type: "swipe"; x: number; y: number }
    | null
  >(null);
  const moved = useRef(0);
  const dragged = useRef(false);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const tapTimer = useRef<number | null>(null);
  const raf = useRef(0);
  const enabledRef = useRef(enabled);
  const onTapRef = useRef(onTap);
  const onSwipeRef = useRef(onSwipe);
  enabledRef.current = enabled;
  onTapRef.current = onTap;
  onSwipeRef.current = onSwipe;

  const stopAnim = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  const commit = useCallback(
    (next: View) => {
      viewRef.current = next;
      const img = imgRef.current;
      if (img) {
        img.style.transform = `translate3d(${next.tx}px, ${next.ty}px, 0) scale(${next.scale})`;
      }
      setView(next);
    },
    [imgRef]
  );

  const animateTo = useCallback(
    (target: View) => {
      stopAnim();
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        commit(target);
        return;
      }
      const from = viewRef.current;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 180);
        const e = 1 - (1 - t) ** 3;
        commit({
          scale: from.scale + (target.scale - from.scale) * e,
          tx: from.tx + (target.tx - from.tx) * e,
          ty: from.ty + (target.ty - from.ty) * e,
        });
        if (t < 1) raf.current = requestAnimationFrame(tick);
        else raf.current = 0;
      };
      raf.current = requestAnimationFrame(tick);
    },
    [commit, stopAnim]
  );

  const boxNow = useCallback((): Box | null => {
    const img = imgRef.current;
    if (!img) return null;
    const box = readBox(img, viewRef.current);
    if (box.width < 2 || box.height < 2) return null;
    return box;
  }, [imgRef]);

  const reset = useCallback(() => {
    stopAnim();
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    tapTimer.current = null;
    commit(IDENTITY);
  }, [commit, stopAnim]);

  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);

  useEffect(() => () => {
    stopAnim();
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
  }, [stopAnim]);

  const zoomBy = useCallback(
    (factor: number) => {
      const box = boxNow();
      if (!box) return;
      const nextScale = clamp(viewRef.current.scale * factor, ZOOM_MIN, ZOOM_MAX);
      animateTo(zoomAt(viewRef.current, 0, 0, nextScale, box.width, box.height));
    },
    [animateTo, boxNow]
  );

  const toggleAt = useCallback(
    (clientX: number, clientY: number) => {
      const box = boxNow();
      if (!box) return;
      if (viewRef.current.scale > 1.05) {
        animateTo(IDENTITY);
        return;
      }
      const focal = focalOf(clientX, clientY, box);
      animateTo(zoomAt(viewRef.current, focal.x, focal.y, ZOOM_DOUBLE, box.width, box.height));
    },
    [animateTo, boxNow]
  );

  useEffect(() => {
    if (!wheel) return;
    const img = imgRef.current;
    const el = img?.parentElement;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!enabledRef.current) return;
      const box = imgRef.current ? readBox(imgRef.current, viewRef.current) : null;
      if (!box || box.width < 2) return;
      e.preventDefault();
      stopAnim();
      const focal = focalOf(e.clientX, e.clientY, box);
      // Trackpad pinch arrives as ctrl+wheel with much smaller deltas than a mouse wheel.
      const speed = e.ctrlKey ? 0.01 : 0.0015;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const nextScale = clamp(viewRef.current.scale * Math.exp(-delta * speed), ZOOM_MIN, ZOOM_MAX);
      commit(zoomAt(viewRef.current, focal.x, focal.y, nextScale, box.width, box.height));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [wheel, resetKey, imgRef, commit, stopAnim]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!enabledRef.current) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    stopAnim();
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = 0;
    const el = e.currentTarget as HTMLElement;
    const zoomed = viewRef.current.scale > 1.02;
    if (capture === "modal" || zoomed || ptrs.current.size >= 2) {
      el.setPointerCapture?.(e.pointerId);
    }
    if (ptrs.current.size >= 2) {
      const pts = [...ptrs.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      gesture.current = {
        type: "pinch",
        dist,
        scale: viewRef.current.scale,
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
      setPanning(false);
      return;
    }
    if (zoomed) {
      gesture.current = {
        type: "pan",
        x: e.clientX,
        y: e.clientY,
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
      };
      setPanning(true);
      return;
    }
    gesture.current = { type: "swipe", x: e.clientX, y: e.clientY };
    setPanning(false);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!enabledRef.current || !ptrs.current.has(e.pointerId)) return;
    const prev = ptrs.current.get(e.pointerId)!;
    moved.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const img = imgRef.current;
    if (!g || !img) return;
    const box = readBox(img, viewRef.current);
    if (box.width < 2) return;

    if (g.type === "pinch" && ptrs.current.size >= 2) {
      const pts = [...ptrs.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const scale = clamp(g.scale * (dist / g.dist), ZOOM_RUBBER_MIN, ZOOM_MAX);
      const origin = focalOf(g.midX, g.midY, box);
      const focal = focalOf(midX, midY, box);
      const localX = (origin.x - g.tx) / (g.scale || 1);
      const localY = (origin.y - g.ty) / (g.scale || 1);
      commit(
        clampView(
          { scale, tx: focal.x - localX * scale, ty: focal.y - localY * scale },
          box.width,
          box.height,
          ZOOM_RUBBER_MIN
        )
      );
      return;
    }

    if (g.type === "pan") {
      commit(
        clampView(
          {
            scale: viewRef.current.scale,
            tx: g.tx + (e.clientX - g.x),
            ty: g.ty + (e.clientY - g.y),
          },
          box.width,
          box.height,
          ZOOM_MIN
        )
      );
    }
  };

  const finishPointers = (e: ReactPointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size >= 2) return;
    if (ptrs.current.size === 1 && viewRef.current.scale > 1.02) {
      const p = [...ptrs.current.values()][0];
      gesture.current = { type: "pan", x: p.x, y: p.y, tx: viewRef.current.tx, ty: viewRef.current.ty };
      setPanning(true);
      return;
    }
    const g = gesture.current;
    gesture.current = null;
    setPanning(false);
    dragged.current = moved.current > 6;
    if (!enabledRef.current) return;

    const box = imgRef.current ? readBox(imgRef.current, viewRef.current) : null;
    if (viewRef.current.scale < 1) {
      animateTo(IDENTITY);
      return;
    }
    if (box) commit(clampView(viewRef.current, box.width, box.height, ZOOM_MIN));

    if (
      g?.type === "swipe" &&
      onSwipeRef.current &&
      viewRef.current.scale <= 1.02 &&
      moved.current > 8
    ) {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
        onSwipeRef.current(dx < 0 ? 1 : -1);
        return;
      }
    }

    if (moved.current > 8) return;
    // Mouse double-click is handled by the caller so it doesn't toggle twice.
    if (e.pointerType === "mouse") return;

    const now = performance.now();
    const last = lastTap.current;
    const isDouble =
      now - last.t < DOUBLE_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 28;
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    if (isDouble) {
      toggleAt(e.clientX, e.clientY);
      return;
    }
    if (onTapRef.current && viewRef.current.scale <= 1.02 && capture === "inline") {
      tapTimer.current = window.setTimeout(() => {
        tapTimer.current = null;
        if (viewRef.current.scale <= 1.02) onTapRef.current?.();
      }, TAP_DELAY_MS);
    }
  };

  return {
    view,
    panning,
    zoomBy,
    reset,
    toggleAt,
    /** True when the pointerup that just finished was a drag, so the following click should be ignored. */
    consumeClick: () => {
      const skip = dragged.current;
      dragged.current = false;
      return skip;
    },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointers,
      onPointerCancel: finishPointers,
    },
  };
}

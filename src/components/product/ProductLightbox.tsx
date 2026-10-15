import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { usePointerImageZoom } from "./usePointerImageZoom";

type Props = {
  images: string[];
  index: number;
  alt: string;
  onIndex: (index: number) => void;
  onClose: () => void;
};

const CLOSE_MS = 150;

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 2.75v10.5M2.75 8h10.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M2.75 8h10.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconChevron({ dir }: { dir: "left" | "right" }) {
  const d = dir === "left" ? "M10 3.25L5.25 8 10 12.75" : "M6 3.25L10.75 8 6 12.75";
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductLightbox({ images, index, alt, onIndex, onClose }: Props) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointerKind = useRef("mouse");
  const safeIndex = Math.min(Math.max(index, 0), Math.max(images.length - 1, 0));
  const src = images[safeIndex] ?? "";
  const count = images.length;
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closeTimer.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  useEffect(() => {
    if (count < 2) return;
    for (const dir of [1, -1]) {
      const next = images[(safeIndex + dir + count) % count];
      if (next) new Image().src = next;
    }
  }, [images, safeIndex, count]);

  const zoom = usePointerImageZoom(imgRef, {
    enabled: true,
    capture: "modal",
    wheel: true,
    onSwipe: count > 1 ? (dir) => onIndex((safeIndex + dir + count) % count) : undefined,
    resetKey: src,
  });

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setReady(true);
    else setReady(false);
  }, [src]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (count > 1 && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        onIndex((safeIndex + dir + count) % count);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoom.zoomBy(1.25);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoom.zoomBy(1 / 1.25);
      } else if (e.key === "0") {
        e.preventDefault();
        zoom.zoomBy(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, requestClose, onIndex, safeIndex, zoom.zoomBy]);

  const step = (dir: 1 | -1) => onIndex((safeIndex + dir + count) % count);
  const percent = Math.round(zoom.view.scale * 100);
  const zoomed = zoom.view.scale > 1.02;

  return createPortal(
    <div
      className={`pdp-lightbox ${closing ? "is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={(e) => {
        if (zoom.consumeClick()) return;
        const el = e.target as HTMLElement;
        if (el.closest("button, a, .pdp-lightbox-bar")) return;
        // Pointer capture retargets the click to the stage, so hit-test the photo itself.
        const r = imgRef.current?.getBoundingClientRect();
        if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
        requestClose();
      }}
    >
      <div className="pdp-lightbox-bar">
        <span className="pdp-lightbox-count">
          {count > 1 ? `${safeIndex + 1} / ${count}` : ""}
        </span>
        <button
          ref={closeRef}
          type="button"
          className="pdp-lb-btn"
          onClick={requestClose}
          aria-label={t("common.close")}
        >
          <IconClose />
        </button>
      </div>

      <div className="pdp-lightbox-body">
        {count > 1 && (
          <button
            type="button"
            className="pdp-lb-btn pdp-lightbox-nav"
            onClick={() => step(-1)}
            aria-label={t("product.previousImage")}
          >
            <IconChevron dir="left" />
          </button>
        )}
        <div
          className={`pdp-lightbox-stage ${zoomed ? "is-zoomed" : ""} ${zoom.panning ? "is-panning" : ""}`}
          {...zoom.handlers}
          onPointerDown={(e) => {
            pointerKind.current = e.pointerType;
            zoom.handlers.onPointerDown(e);
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            if (pointerKind.current !== "mouse") return;
            zoom.toggleAt(e.clientX, e.clientY);
          }}
        >
          {!ready && <span className="pdp-image-spinner pdp-image-spinner--light" aria-hidden />}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`pdp-lightbox-image ${ready ? "" : "is-pending"}`}
            draggable={false}
            style={{
              transform: `translate3d(${zoom.view.tx}px, ${zoom.view.ty}px, 0) scale(${zoom.view.scale})`,
            }}
            onLoad={() => setReady(true)}
            onError={() => setReady(true)}
          />
        </div>
        {count > 1 && (
          <button
            type="button"
            className="pdp-lb-btn pdp-lightbox-nav"
            onClick={() => step(1)}
            aria-label={t("product.nextImage")}
          >
            <IconChevron dir="right" />
          </button>
        )}
      </div>

      <div className="pdp-lightbox-bar">
        <div className="pdp-lightbox-tools">
          <button
            type="button"
            className="pdp-lb-btn pdp-lb-btn--accent"
            onClick={() => zoom.zoomBy(1 / 1.25)}
            disabled={!zoomed}
            aria-label={t("product.zoomOut")}
          >
            <IconMinus />
          </button>
          <span className="pdp-lightbox-zoom-label" aria-live="polite">
            {percent}%
          </span>
          <button
            type="button"
            className="pdp-lb-btn pdp-lb-btn--accent"
            onClick={() => zoom.zoomBy(1.25)}
            disabled={zoom.view.scale >= 3.98}
            aria-label={t("product.zoomIn")}
          >
            <IconPlus />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

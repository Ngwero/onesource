import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePointerImageZoom } from "./usePointerImageZoom";

const LOUPE_MAX = 176;
const LOUPE_ZOOM = 2.35;

type Props = {
  imageSrc: string;
  alt: string;
  discount?: number;
  onOpenLightbox: () => void;
  onSwipeImage?: (direction: 1 | -1) => void;
  enlargeLabel: string;
  rollOverHint: string;
  tapHint: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const hoverQuery = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

export function ProductImageZoom({
  imageSrc,
  alt,
  discount = 0,
  onOpenLightbox,
  onSwipeImage,
  enlargeLabel,
  rollOverHint,
  tapHint,
}: Props) {
  const stageRef = useRef<HTMLButtonElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const loupeImgRef = useRef<HTMLImageElement>(null);
  const loupeOnRef = useRef(false);
  const pointerKind = useRef("mouse");
  const pending = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  const [hoverZoomEnabled, setHoverZoomEnabled] = useState(
    () => typeof window !== "undefined" && window.matchMedia(hoverQuery).matches
  );
  const [ready, setReady] = useState(false);
  const [loupeOn, setLoupeOn] = useState(false);

  const zoom = usePointerImageZoom(imgRef, {
    enabled: !hoverZoomEnabled,
    capture: "inline",
    onTap: onOpenLightbox,
    onSwipe: onSwipeImage,
    resetKey: imageSrc,
  });

  useEffect(() => {
    const mq = window.matchMedia(hoverQuery);
    const sync = () => setHoverZoomEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setReady(true);
    else setReady(false);
  }, [imageSrc]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    []
  );

  const hideLoupe = () => {
    if (!loupeOnRef.current) return;
    loupeOnRef.current = false;
    setLoupeOn(false);
  };

  const positionLoupe = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const img = imgRef.current;
    const loupe = loupeRef.current;
    const loupeImg = loupeImgRef.current;
    if (!stage || !img || !loupe || !loupeImg || !hoverZoomEnabled) return;

    const stageRect = stage.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    if (imgRect.width < 88 || imgRect.height < 88) {
      hideLoupe();
      return;
    }

    const ix = clientX - imgRect.left;
    const iy = clientY - imgRect.top;
    if (ix < 0 || iy < 0 || ix > imgRect.width || iy > imgRect.height) {
      hideLoupe();
      return;
    }

    const size = Math.round(Math.min(LOUPE_MAX, imgRect.width * 0.5, imgRect.height * 0.5));
    const half = size / 2;
    const originX = stageRect.left + stage.clientLeft;
    const originY = stageRect.top + stage.clientTop;
    const imgLeft = imgRect.left - originX;
    const imgTop = imgRect.top - originY;
    const localX = clientX - originX;
    const localY = clientY - originY;
    const maxX = imgLeft + imgRect.width - half;
    const maxY = imgTop + imgRect.height - half;
    if (maxX < imgLeft + half || maxY < imgTop + half) {
      hideLoupe();
      return;
    }
    const cx = clamp(localX, imgLeft + half, maxX);
    const cy = clamp(localY, imgTop + half, maxY);
    const sampleX = cx - imgLeft;
    const sampleY = cy - imgTop;

    loupe.style.width = `${size}px`;
    loupe.style.height = `${size}px`;
    loupe.style.transform = `translate3d(${cx - half}px, ${cy - half}px, 0)`;
    loupeImg.style.width = `${imgRect.width * LOUPE_ZOOM}px`;
    loupeImg.style.height = `${imgRect.height * LOUPE_ZOOM}px`;
    loupeImg.style.transform = `translate3d(${half - sampleX * LOUPE_ZOOM}px, ${half - sampleY * LOUPE_ZOOM}px, 0)`;

    if (!loupeOnRef.current) {
      loupeOnRef.current = true;
      setLoupeOn(true);
    }
  };

  const queueLoupe = (x: number, y: number) => {
    pending.current = { x, y };
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const point = pending.current;
      if (point) positionLoupe(point.x, point.y);
    });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!hoverZoomEnabled) {
      zoom.handlers.onPointerMove(e);
      return;
    }
    if (e.pointerType === "touch") return;
    queueLoupe(e.clientX, e.clientY);
  };

  const zoomed = !hoverZoomEnabled && zoom.view.scale > 1.02;

  return (
    <div className={`pdp-zoom-main-col ${loupeOn ? "is-zooming" : ""}`}>
      <button
        ref={stageRef}
        type="button"
        className={`pdp-image-stage ${hoverZoomEnabled ? "pdp-image-stage--hover-zoom" : "pdp-image-stage--touch"} ${loupeOn ? "is-loupe" : ""} ${zoomed ? "is-zoomed" : ""}`}
        onClick={() => {
          if (zoom.consumeClick()) return;
          if (pointerKind.current === "touch") return;
          if (zoom.view.scale > 1.02) return;
          onOpenLightbox();
        }}
        onPointerDown={(e) => {
          pointerKind.current = e.pointerType;
          if (!hoverZoomEnabled) zoom.handlers.onPointerDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => {
          if (!hoverZoomEnabled) zoom.handlers.onPointerUp(e);
        }}
        onPointerCancel={(e) => {
          if (!hoverZoomEnabled) zoom.handlers.onPointerCancel(e);
        }}
        onPointerLeave={hideLoupe}
        aria-label={enlargeLabel}
      >
        {discount > 0 && <span className="pdp-badge-deal">-{discount}%</span>}
        {!ready && <span className="pdp-image-spinner" aria-hidden />}
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`pdp-main-image ${ready ? "" : "is-loading"}`}
          draggable={false}
          decoding="async"
          style={
            hoverZoomEnabled
              ? undefined
              : {
                  transform: `translate3d(${zoom.view.tx}px, ${zoom.view.ty}px, 0) scale(${zoom.view.scale})`,
                }
          }
          onLoad={() => setReady(true)}
          onError={() => setReady(true)}
        />
        <span ref={loupeRef} className={`pdp-zoom-loupe ${loupeOn ? "is-on" : ""}`} aria-hidden>
          <img ref={loupeImgRef} src={imageSrc} alt="" draggable={false} />
        </span>
        <span className="pdp-zoom-hint" aria-hidden>
          {hoverZoomEnabled ? rollOverHint : tapHint}
        </span>
      </button>
    </div>
  );
}

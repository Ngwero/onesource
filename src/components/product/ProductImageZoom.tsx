import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

const ZOOM_LEVEL = 2.5;
const LENS_RATIO = 0.42;
/** Magnified preview panel vs main image stage (Amazon-style larger flyout). */
const FLYOUT_WIDTH_SCALE = 2.25;
const FLYOUT_HEIGHT_SCALE = 2.15;
const FLYOUT_MAX_WIDTH = 720;
const FLYOUT_MAX_HEIGHT = 680;
const FLYOUT_GAP = 16;

type LensState = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ZoomPan = {
  ratioX: number;
  ratioY: number;
  stageW: number;
  stageH: number;
};

type StageRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type Props = {
  imageSrc: string;
  alt: string;
  discount?: number;
  onOpenLightbox: () => void;
  enlargeLabel: string;
  rollOverHint: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readStageRect(stage: HTMLElement): StageRect {
  const rect = stage.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function ProductImageZoom({
  imageSrc,
  alt,
  discount = 0,
  onOpenLightbox,
  enlargeLabel,
  rollOverHint,
}: Props) {
  const stageRef = useRef<HTMLButtonElement>(null);
  const [hoverZoomEnabled, setHoverZoomEnabled] = useState(false);
  const [zooming, setZooming] = useState(false);
  const [lens, setLens] = useState<LensState | null>(null);
  const [pan, setPan] = useState<ZoomPan | null>(null);
  const [stageRect, setStageRect] = useState<StageRect | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 1024px) and (hover: hover) and (pointer: fine)"
    );
    const sync = () => setHoverZoomEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const updateZoom = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage || !hoverZoomEnabled) return;

      const rect = readStageRect(stage);
      setStageRect(rect);

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const lensW = rect.width * LENS_RATIO;
      const lensH = rect.height * LENS_RATIO;
      const maxLeft = Math.max(rect.width - lensW, 0);
      const maxTop = Math.max(rect.height - lensH, 0);

      const lensLeft = clamp(x - lensW / 2, 0, maxLeft);
      const lensTop = clamp(y - lensH / 2, 0, maxTop);

      setLens({ left: lensLeft, top: lensTop, width: lensW, height: lensH });
      setPan({
        ratioX: maxLeft > 0 ? lensLeft / maxLeft : 0,
        ratioY: maxTop > 0 ? lensTop / maxTop : 0,
        stageW: rect.width,
        stageH: rect.height,
      });
    },
    [hoverZoomEnabled]
  );

  const handleMouseEnter = () => {
    if (!hoverZoomEnabled) return;
    const stage = stageRef.current;
    if (stage) setStageRect(readStageRect(stage));
    setZooming(true);
  };

  const handleMouseLeave = () => {
    setZooming(false);
    setLens(null);
    setPan(null);
    setStageRect(null);
  };

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!hoverZoomEnabled) return;
    updateZoom(e.clientX, e.clientY);
  };

  const flyoutVisible =
    zooming && hoverZoomEnabled && lens && pan && stageRect;
  const flyoutW = pan
    ? Math.min(Math.round(pan.stageW * FLYOUT_WIDTH_SCALE), FLYOUT_MAX_WIDTH)
    : 0;
  const flyoutH = pan
    ? Math.min(Math.round(pan.stageH * FLYOUT_HEIGHT_SCALE), FLYOUT_MAX_HEIGHT)
    : 0;
  const flyoutScaleW = pan && pan.stageW > 0 ? flyoutW / pan.stageW : 1;
  const flyoutScaleH = pan && pan.stageH > 0 ? flyoutH / pan.stageH : 1;
  const zoomW = pan ? pan.stageW * ZOOM_LEVEL * flyoutScaleW : 0;
  const zoomH = pan ? pan.stageH * ZOOM_LEVEL * flyoutScaleH : 0;
  const offsetX = pan ? pan.ratioX * Math.max(zoomW - flyoutW, 0) : 0;
  const offsetY = pan ? pan.ratioY * Math.max(zoomH - flyoutH, 0) : 0;

  let flyoutLeft = 0;
  let flyoutTop = 0;
  if (stageRect && flyoutW > 0 && flyoutH > 0) {
    const preferRight = stageRect.right + FLYOUT_GAP;
    const fitsRight = preferRight + flyoutW <= window.innerWidth - 8;
    flyoutLeft = fitsRight
      ? preferRight
      : Math.max(8, stageRect.left - FLYOUT_GAP - flyoutW);
    flyoutTop = clamp(
      stageRect.top,
      8,
      Math.max(8, window.innerHeight - flyoutH - 8)
    );
  }

  return (
    <div className={`pdp-zoom-main-col ${flyoutVisible ? "is-zooming" : ""}`}>
      <button
        ref={stageRef}
        type="button"
        className={`pdp-image-stage flex-1 relative group ${hoverZoomEnabled ? "pdp-image-stage--hover-zoom" : ""}`}
        onClick={onOpenLightbox}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        aria-label={enlargeLabel}
      >
        {discount > 0 && <span className="pdp-badge-deal">-{discount}%</span>}
        <img
          src={imageSrc}
          alt={alt}
          className="pdp-main-image"
          draggable={false}
        />
        {flyoutVisible && lens && (
          <span
            className="pdp-zoom-lens"
            style={{
              left: lens.left,
              top: lens.top,
              width: lens.width,
              height: lens.height,
            }}
            aria-hidden
          />
        )}
        <span className="pdp-zoom-hint" aria-hidden>
          {hoverZoomEnabled ? rollOverHint : enlargeLabel}
        </span>
      </button>

      {flyoutVisible &&
        pan &&
        createPortal(
          <div
            className="pdp-zoom-flyout pdp-zoom-flyout--portal"
            aria-hidden
            style={{
              width: flyoutW,
              height: flyoutH,
              left: flyoutLeft,
              top: flyoutTop,
            }}
          >
            <img
              src={imageSrc}
              alt=""
              className="pdp-zoom-flyout-image"
              draggable={false}
              style={{
                width: zoomW,
                height: zoomH,
                transform: `translate(${-offsetX}px, ${-offsetY}px)`,
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ProductImage } from "../ProductImage";
import { cosmeticsAislePath } from "../../utils/cosmeticsMode";

export type CosmeticsCategoryTile = {
  id: string;
  label: string;
  image: string;
};

/** Marquee speed in px/s; the loop duration is clamped to 30–60s. */
const SPEED = 55;
const MIN_SECONDS = 30;
const MAX_SECONDS = 60;
/** How long the strip stays still after a touch ends, so a swipe can be followed by a tap. */
const TOUCH_RESUME_MS = 2500;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * "Shop by category" circles that drift sideways in an endless loop. Pauses on hover, keyboard
 * focus and touch (the strip can then be swiped by hand); falls back to a plain scroller when the
 * user prefers reduced motion.
 */
export function CosmeticsCategoryMarquee({ tiles }: { tiles: CosmeticsCategoryTile[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<number | undefined>(undefined);
  const [groupWidth, setGroupWidth] = useState(0);
  const [copies, setCopies] = useState(2);
  const [touchPaused, setTouchPaused] = useState(false);

  const animated = !reducedMotion && tiles.length > 1;

  useLayoutEffect(() => {
    if (!animated) return;
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return;
    const measure = () => {
      const width = group.offsetWidth;
      if (width <= 0) return;
      setGroupWidth(width);
      // One extra copy covers the drift, another lets a hand-scrolled strip keep looping.
      setCopies(Math.max(2, Math.ceil(viewport.clientWidth / width) + 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(group);
    return () => ro.disconnect();
  }, [animated, tiles]);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  /** The content repeats every `groupWidth` px, so hand scrolling can be folded back invisibly. */
  const foldScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || groupWidth <= 0) return;
    if (viewport.scrollLeft >= groupWidth) viewport.scrollLeft %= groupWidth;
  }, [groupWidth]);

  const onTouchStart = () => {
    window.clearTimeout(resumeTimer.current);
    setTouchPaused(true);
  };

  const onTouchEnd = () => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      foldScroll();
      setTouchPaused(false);
    }, TOUCH_RESUME_MS);
  };

  const renderGroup = (copy: number) => {
    const hidden = copy > 0;
    return (
      <div
        key={copy}
        ref={copy === 0 ? groupRef : undefined}
        className="cos-circles-group"
        aria-hidden={hidden || undefined}
      >
        {tiles.map((tile, index) => (
          <Link
            key={tile.id}
            to={cosmeticsAislePath(tile.id)}
            className="cos-circle"
            tabIndex={hidden ? -1 : undefined}
            draggable={false}
          >
            <span className="cos-circle-media">
              <ProductImage src={tile.image} alt="" size="thumb" priority={!hidden && index < 8} />
            </span>
            <span className="cos-circle-label">{tile.label}</span>
          </Link>
        ))}
      </div>
    );
  };

  if (!animated) {
    return (
      <div className="cos-circles">
        <div className="cos-circles-track">{renderGroup(0)}</div>
      </div>
    );
  }

  const seconds = groupWidth
    ? Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, groupWidth / SPEED))
    : Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, tiles.length * 2.2));
  const style = {
    "--cos-marquee-duration": `${seconds}s`,
    "--cos-marquee-shift": groupWidth ? `${groupWidth}px` : `${100 / copies}%`,
  } as CSSProperties;

  return (
    <div
      ref={viewportRef}
      className={`cos-circles cos-circles--marquee${touchPaused ? " is-paused" : ""}`}
      style={style}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseLeave={foldScroll}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) foldScroll();
      }}
    >
      <div className="cos-circles-track">
        {Array.from({ length: copies }, (_, copy) => renderGroup(copy))}
      </div>
    </div>
  );
}

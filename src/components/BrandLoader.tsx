import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

/** Background the loader sits on: "light" wraps the white animation in a brand-green badge. */
export type BrandLoaderTone = "light" | "onDark";

const BrandLoaderAnimation = lazy(() => import("./BrandLoaderAnimation"));

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

type Props = {
  /** Rendered width/height in px. */
  size?: number;
  tone?: BrandLoaderTone;
  /** Accessible label; defaults to the shared "Loading…" string. */
  label?: string;
  /** Set when a parent already exposes role="status" so the loader stays purely visual. */
  decorative?: boolean;
  className?: string;
};

/** One Source branded Lottie loader. Shows a static frame when the user prefers reduced motion. */
export function BrandLoader({ size = 64, tone = "light", label, decorative = false, className = "" }: Props) {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const style = { width: size, height: size } as CSSProperties;
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "status", "aria-label": label ?? t("common.loading") } as const);

  return (
    <span className={`brand-loader brand-loader--${tone} ${className}`.trim()} style={style} {...a11y}>
      <Suspense fallback={<span className="brand-loader-fallback" aria-hidden />}>
        <BrandLoaderAnimation animate={!reducedMotion} className="brand-loader-anim" />
      </Suspense>
    </span>
  );
}

/** Centered page-level loading block. */
export function PageLoader({ size = 80, label }: { size?: number; label?: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <BrandLoader size={size} label={label} />
    </div>
  );
}

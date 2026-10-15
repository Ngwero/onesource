import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BRAND_LOGOS } from "../brand/logos";
import { BrandLoader } from "./BrandLoader";
import { useLocation } from "react-router-dom";
import { useProducts, type ProductShop } from "../context/ProductsContext";
import { useEnsureShops } from "../hooks/useEnsureShops";
import { shopModeForPath } from "../utils/shopMode";

const MIN_VISIBLE_MS = 850;
const EXIT_MS = 400;

type Phase = "loading" | "exiting" | "done";

type Props = { children: ReactNode };

/** Pages that page products from the API themselves instead of using the shop catalogue. */
const SELF_LOADING_PATHS = [
  /^\/kitchen(\/|$)/,
  /^\/cosmetics(\/|$)/,
];

function shopsNeededFor(pathname: string): ProductShop[] {
  // Product pages load that one product by id. They must not sit behind the catalogue.
  if (/^\/product\//.test(pathname)) return [];
  if (SELF_LOADING_PATHS.some((re) => re.test(pathname))) return [];
  return [shopModeForPath(pathname)];
}

export function WebsiteLoader({ children }: Props) {
  const { t } = useTranslation();
  const { shopLoading, error, refresh, products } = useProducts();
  const { pathname } = useLocation();
  const neededShops = shopsNeededFor(pathname);
  useEnsureShops(neededShops);
  const loading = neededShops.some((shop) => shopLoading[shop]);
  // A slow background fill must not replace a shop that already has products.
  const outage = Boolean(error) && products.length === 0;
  const mountTime = useRef(Date.now());
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    document.getElementById("app-loader")?.remove();
  }, []);

  useEffect(() => {
    // Stay on the brand loader until the shop's first small batch is in, including a
    // slow success and the one automatic retry; the rest of the catalogue loads behind
    // the page. An error only ends the wait once loading stops.
    if (loading) {
      setPhase((current) => (current === "loading" ? current : "loading"));
      return;
    }

    const elapsed = Date.now() - mountTime.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);

    const timer = window.setTimeout(() => {
      setPhase(outage ? "done" : "exiting");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [loading, outage]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = window.setTimeout(() => setPhase("done"), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (!loading && phase === "done" && outage) {
    return (
      <div className="site-loader-error page-container">
        <div className="card p-8 max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold text-deal mb-2">{t("shop.unavailable")}</h2>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <p className="text-xs text-text-muted mb-6">{t("shop.setupHint")}</p>
          <button type="button" onClick={() => refresh()} className="btn-primary">
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {phase !== "done" && (
      <div
        className={`site-loader${phase === "exiting" ? " site-loader--exit" : ""}`}
        role="status"
        aria-live="polite"
        aria-busy={phase === "loading"}
        aria-label={t("shop.loading")}
      >
        <div className="site-loader-panel">
          <img
            src={BRAND_LOGOS.onDarkStacked}
            alt={t("common.brand")}
            className="site-loader-logo"
            width={96}
            height={96}
          />
          <p className="site-loader-slogan">{t("shop.slogan")}</p>
          <BrandLoader size={56} tone="onDark" decorative className="site-loader-lottie" />
          <p className="site-loader-text">{t("shop.loading")}</p>
        </div>
      </div>
      )}
    </>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BRAND_LOGOS } from "../brand/logos";
import { useProducts } from "../context/ProductsContext";

const MIN_VISIBLE_MS = 750;
const EXIT_MS = 450;

type Phase = "loading" | "exiting" | "done";

type Props = { children: ReactNode };

export function WebsiteLoader({ children }: Props) {
  const { t } = useTranslation();
  const { loading, error, refresh } = useProducts();
  const mountTime = useRef(Date.now());
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    document.getElementById("app-loader")?.remove();
  }, []);

  useEffect(() => {
    if (loading && !error) return;

    const elapsed = Date.now() - mountTime.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);

    const timer = window.setTimeout(() => setPhase("exiting"), delay);
    return () => window.clearTimeout(timer);
  }, [loading, error]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = window.setTimeout(() => setPhase("done"), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "done") {
    if (error) {
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
    return <>{children}</>;
  }

  return (
    <>
      {phase === "exiting" ? children : null}
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
            width={200}
            height={80}
          />
          <div className="site-loader-bar" aria-hidden>
            <span className="site-loader-bar-fill" />
          </div>
          <p className="site-loader-text">{t("shop.loading")}</p>
        </div>
      </div>
    </>
  );
}

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/CurrencyContext";
import { CURRENCIES } from "../currency/currencies";

export function CurrencySwitcher() {
  const { t } = useTranslation();
  const { currency, setCurrency, ratesUpdatedAt, loading, refreshRates } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = CURRENCIES.find((c) => c.code === currency)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const updatedLabel = ratesUpdatedAt
    ? new Date(ratesUpdatedAt).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="header-switcher-btn flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-border bg-surface hover:bg-muted transition-colors text-sm font-medium min-h-[44px] min-w-[44px] sm:min-w-0 justify-center"
        aria-label={t("currency.select")}
        aria-expanded={open}
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline font-semibold">{current.code}</span>
        {loading && (
          <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        )}
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="header-switcher-menu absolute right-0 top-full mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface shadow-xl py-2 z-[60]">
          <p className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
            {t("currency.select")}
          </p>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setCurrency(c.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                currency === c.code
                  ? "bg-accent-light text-accent font-semibold"
                  : "hover:bg-muted text-text"
              }`}
            >
              <span className="text-lg">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{t(`currency.names.${c.nameKey}`)}</p>
                <p className="text-xs text-text-muted">{c.code} · {c.symbol}</p>
              </div>
              {currency === c.code && (
                <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t border-border mt-2 px-4 py-3">
            <p className="text-[10px] text-text-muted leading-relaxed">
              {t("currency.liveRates")}
              {updatedLabel && (
                <>
                  <br />
                  <span className="text-accent">{t("currency.updated", { time: updatedLabel })}</span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => refreshRates()}
              className="mt-2 text-xs font-semibold text-accent hover:underline"
            >
              {t("currency.refresh")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

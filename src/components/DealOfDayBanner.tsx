import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchActiveDeals, type ActiveDeal } from "../api/client";
import { useCurrency } from "../context/CurrencyContext";
import { isFlagEnabled, loadFeatureFlags } from "../lib/featureFlags";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
}

export function DealOfDayBanner() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [deal, setDeal] = useState<ActiveDeal | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [enabled, setEnabled] = useState(isFlagEnabled("timedDeals") || isFlagEnabled("deals"));

  useEffect(() => {
    let cancelled = false;
    loadFeatureFlags().then((f) => {
      if (!cancelled) setEnabled(f.timedDeals || f.deals);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let skew = 0;
    fetchActiveDeals().then(({ deals, serverNow }) => {
      if (cancelled) return;
      const pick = deals.find((d) => d.dealOfDay && d.live) || deals.find((d) => d.live) || null;
      setDeal(pick);
      if (pick) {
        skew = Date.now() - new Date(serverNow).getTime();
        const end = new Date(pick.endsAt).getTime();
        setRemaining(Math.max(0, end - (Date.now() - skew)));
      }
    });
    const tick = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1000));
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [enabled]);

  if (!enabled || !deal || remaining <= 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
          {deal.dealOfDay ? t("deals.dealOfDay") : t("deals.timedDeal")}
        </p>
        <p className="text-sm sm:text-base font-semibold text-text mt-0.5 truncate">
          {deal.title || t("deals.endsIn")}
          {deal.dealPrice != null ? ` · ${formatPrice(deal.dealPrice)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-lg font-bold text-amber-900 tabular-nums" aria-live="polite">
          {formatRemaining(remaining)}
        </span>
        <Link to={`/product/${deal.productId}`} className="btn-primary min-h-[40px] px-4 text-sm">
          {t("deals.shopDeal")}
        </Link>
      </div>
    </div>
  );
}

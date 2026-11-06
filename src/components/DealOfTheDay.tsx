import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { useCurrency } from "../context/CurrencyContext";
import { ProductImage } from "./ProductImage";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

type Deal = {
  id: string;
  productId: string;
  title: string;
  dealPrice: number;
  endsAt: string;
  msRemaining: number;
  dealOfDay?: boolean;
  live?: boolean;
};

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Countdown driven by serverNow + msRemaining — never trusts device clock for expiry. */
export function DealOfTheDay() {
  const { t } = useTranslation();
  const { enabled, ready } = useFeatureFlags();
  const { formatPrice } = useCurrency();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [msLeft, setMsLeft] = useState(0);

  useEffect(() => {
    if (!ready || (!enabled("timedDeals") && !enabled("deals"))) return;
    let cancelled = false;
    fetch(`${API_BASE}/deals/active`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const deals = (data.deals ?? []) as Deal[];
        const pick =
          deals.find((d) => d.dealOfDay && d.live !== false) ||
          deals.find((d) => d.live !== false) ||
          deals[0];
        if (!pick) return;
        setDeal(pick);
        setMsLeft(Number(pick.msRemaining) || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, enabled]);

  useEffect(() => {
    if (!deal) return;
    const tick = window.setInterval(() => {
      setMsLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [deal]);

  if (!ready || (!enabled("timedDeals") && !enabled("deals")) || !deal || msLeft <= 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-amber-50 to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-text">{t("deals.dealOfDay", "Deal of the Day")}</h2>
        <p className="font-mono text-sm font-semibold text-deal tabular-nums">
          {t("deals.endsIn", "Ends in")} {formatCountdown(msLeft)}
        </p>
      </div>
      <Link
        to={`/product/${deal.productId}`}
        className="mt-3 flex gap-3 items-center hover:opacity-90"
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-border flex-shrink-0 bg-white">
          <ProductImage src="" alt={deal.title} size="thumb" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-text line-clamp-2">{deal.title}</p>
          <p className="text-accent font-bold mt-1">{formatPrice(deal.dealPrice)}</p>
        </div>
      </Link>
    </section>
  );
}

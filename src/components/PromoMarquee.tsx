import { useTranslation } from "react-i18next";

export function PromoMarquee() {
  const { t } = useTranslation();
  const raw = t("home.promoTicker", { returnObjects: true });
  const phrases = Array.isArray(raw) ? (raw as string[]).filter(Boolean) : [];
  if (phrases.length === 0) return null;

  const track = [...phrases, ...phrases];

  return (
    <div
      className="promo-marquee relative overflow-hidden rounded-2xl border border-border bg-surface text-text"
      aria-label={t("home.promoTickerLabel")}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-surface to-transparent sm:w-12" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-surface to-transparent sm:w-12" />
      <div className="promo-marquee-track flex w-max items-center gap-10 py-3 sm:py-3.5">
        {track.map((text, index) => (
          <span
            key={`${text}-${index}`}
            className="inline-flex shrink-0 items-center gap-10 text-sm font-semibold tracking-wide text-text-muted sm:text-base"
          >
            {text}
            <span className="text-lemon" aria-hidden>
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

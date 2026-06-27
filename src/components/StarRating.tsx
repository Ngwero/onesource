import { useTranslation } from "react-i18next";

type Props = { rating: number; size?: "sm" | "md"; variant?: "default" | "brand" };

export function StarRating({ rating, size = "sm", variant = "default" }: Props) {
  const { t } = useTranslation();
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const sizeCls = size === "sm" ? "text-xs" : "text-base";
  const filledCls =
    variant === "brand" ? "text-[var(--color-highlight)]" : "text-amber-400";
  const emptyCls =
    variant === "brand" ? "text-[var(--color-border)]" : "text-gray-200";

  return (
    <span
      className={`inline-flex leading-none ${sizeCls}`}
      aria-label={t("product.ratingAria", { rating })}
    >
      <span className={filledCls}>{"★".repeat(full)}</span>
      {half && <span className={filledCls}>⯨</span>}
      <span className={emptyCls}>{"★".repeat(empty)}</span>
    </span>
  );
}

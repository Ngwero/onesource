import { useTranslation } from "react-i18next";

type Props = {
  rating: number;
  size?: "xs" | "sm" | "md";
  variant?: "default" | "brand";
  /** Hide from assistive tech when a sibling label already describes the rating. */
  decorative?: boolean;
};

const SIZE_CLS = { xs: "text-[0.8rem]", sm: "text-xs", md: "text-base" } as const;

export function StarRating({ rating, size = "sm", variant = "default", decorative = false }: Props) {
  const { t } = useTranslation();
  const halves = Math.round(Math.min(5, Math.max(0, rating)) * 2);
  const filledCls =
    variant === "brand" ? "text-star" : "text-amber-400";
  const emptyCls =
    variant === "brand" ? "text-[var(--color-border)]" : "text-gray-200";

  return (
    <span
      className={`star-rating ${SIZE_CLS[size]}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : t("product.ratingAria", { rating })}
    >
      <span className={emptyCls}>★★★★★</span>
      <span className={`star-rating-fill ${filledCls}`} style={{ width: `${halves * 10}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

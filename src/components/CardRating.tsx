import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { getVerifiedRating } from "../utils/productRating";
import { StarRating } from "./StarRating";

type Props = {
  product: Product;
  /** Show the numeric average (e.g. "4.6") before the stars. */
  showAverage?: boolean;
  className?: string;
};

/** One-line star row for product cards; products without real reviews get grey stars + "No reviews yet". */
export function CardRating({ product, showAverage = false, className = "" }: Props) {
  const { t, i18n } = useTranslation();
  const verified = getVerifiedRating(product);

  if (!verified) {
    return (
      <div className={`card-rating card-rating--none ${className}`}>
        <StarRating rating={0} size="xs" variant="brand" decorative />
        <span className="card-rating-none">{t("productCard.noReviews")}</span>
      </div>
    );
  }

  const average = verified.rating.toLocaleString(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <div className={`card-rating ${className}`}>
      {showAverage && (
        <span className="card-rating-avg" aria-hidden>
          {average}
        </span>
      )}
      <StarRating rating={verified.rating} size="xs" variant="brand" />
      <span
        className="card-rating-count"
        aria-label={t("product.ratingsLink", { count: verified.count.toLocaleString(i18n.language) })}
      >
        ({verified.count.toLocaleString(i18n.language)})
      </span>
    </div>
  );
}

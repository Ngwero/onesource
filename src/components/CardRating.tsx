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

/** One-line star row for product cards. Products without a real ratingSource show 5 filled stars. */
export function CardRating({ product, showAverage = false, className = "" }: Props) {
  const { t, i18n } = useTranslation();
  const verified = getVerifiedRating(product);

  if (!verified) {
    return (
      <div className={`card-rating ${className}`}>
        <StarRating rating={5} size="xs" variant="brand" />
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

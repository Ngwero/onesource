import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { StarRating } from "../StarRating";
import { buildReviewHistogram } from "../../utils/productDetails";
import type { Product } from "../../types/product";
import { useLocalizedProduct } from "../../i18n/useLocalizedProduct";

type Props = {
  product: Product;
  customersSay?: string | null;
};

export function ProductReviewsSection({ product, customersSay }: Props) {
  const { t } = useTranslation();
  const { localizedTitle } = useLocalizedProduct(product);
  const histogram = buildReviewHistogram(product.rating, product.reviewCount);

  const sampleReviews = [
    {
      stars: Math.min(5, Math.max(1, Math.round(product.rating))),
      title: t("product.sampleReview1Title"),
      body: t("product.sampleReview1Body", {
        product: localizedTitle.replace(/\s*–\s*One Source$/i, ""),
      }),
      helpful: Math.max(1, Math.floor(product.reviewCount * 0.02)),
      verified: true,
    },
    {
      stars: Math.max(1, Math.min(5, Math.round(product.rating) - 1)),
      title: t("product.sampleReview2Title"),
      body: t("product.sampleReview2Body"),
      helpful: 1,
      verified: true,
    },
    {
      stars: Math.round(product.rating),
      title: t("product.sampleReview3Title"),
      body: t("product.sampleReview3Body"),
      helpful: Math.max(1, Math.floor(product.reviewCount * 0.01)),
      verified: false,
    },
  ];

  return (
    <section id="pdp-reviews" className="pdp-reviews scroll-mt-24">
      <h2 className="pdp-details-heading-lg">{t("product.customerReviews")}</h2>

      <div className="pdp-reviews-summary">
        <div className="pdp-reviews-score">
          <span className="pdp-reviews-avg">{product.rating.toFixed(1)}</span>
          <span className="text-sm text-text-muted">{t("product.outOf5")}</span>
          <StarRating rating={product.rating} size="md" variant="brand" />
          <Link to="#pdp-reviews" className="text-sm text-accent mt-1 inline-block hover:underline">
            {product.reviewCount.toLocaleString()} {t("product.globalRatings")}
          </Link>
        </div>
        <div className="pdp-reviews-bars flex-1 min-w-0">
          {histogram.map((row) => (
            <a
              key={row.stars}
              href={`#review-${row.stars}-star`}
              className="pdp-review-bar-row pdp-review-bar-link"
            >
              <span className="pdp-review-bar-label">
                {row.stars} {t("product.star")}
              </span>
              <div className="pdp-review-bar-track">
                <div className="pdp-review-bar-fill" style={{ width: `${row.percent}%` }} />
              </div>
              <span className="pdp-review-bar-pct">{row.percent}%</span>
            </a>
          ))}
        </div>
      </div>

      {customersSay && (
        <div className="pdp-customers-say">
          <h3 className="pdp-customers-say-title">{t("product.customersSay")}</h3>
          <p className="pdp-customers-say-text">{customersSay}</p>
          <p className="pdp-customers-say-note">{t("product.customersSayNote")}</p>
        </div>
      )}

      <p className="text-sm text-text-muted mt-4 mb-6">{t("product.reviewsHowItWorks")}</p>

      <h3 className="font-bold text-text mb-4">{t("product.topReviews")}</h3>
      <ul className="space-y-6">
        {sampleReviews.map((review, i) => (
          <li key={i} id={`review-${review.stars}-star`} className="pdp-review-card scroll-mt-24">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <StarRating rating={review.stars} size="sm" variant="brand" />
              <span className="font-semibold text-sm text-text">{review.title}</span>
              {review.verified && (
                <span className="pdp-verified-badge">{t("product.verifiedPurchase")}</span>
              )}
            </div>
            <p className="text-xs text-text-muted mb-2">{t("product.reviewedInUganda")}</p>
            <p className="text-sm text-text leading-relaxed">{review.body}</p>
            <button type="button" className="pdp-review-helpful">
              {t("product.peopleFoundHelpful", { count: review.helpful })}
            </button>
          </li>
        ))}
      </ul>

      {product.reviewCount > 3 && (
        <p className="text-sm mt-4">
          <button
            type="button"
            className="text-accent hover:text-accent-hover hover:underline font-semibold"
          >
            {t("product.seeAllReviews", { count: product.reviewCount.toLocaleString() })}
          </button>
        </p>
      )}
    </section>
  );
}

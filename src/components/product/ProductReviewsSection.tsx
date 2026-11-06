import { Link } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { StarRating } from "../StarRating";
import { buildReviewHistogram } from "../../utils/productDetails";
import { getVerifiedRating } from "../../utils/productRating";
import { useAuth } from "../../context/AuthContext";
import {
  fetchProductReviews,
  fetchReviewEligibility,
  submitProductReview,
  type ProductReview,
  type ReviewEligibility,
} from "../../api/client";
import type { Product } from "../../types/product";

type Props = {
  product: Product;
  customersSay?: string | null;
};

export function ProductReviewsSection({ product, customersSay }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const verified = getVerifiedRating(product);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [rating, setFormRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetchProductReviews(product.id)
      .then((list) => {
        if (!cancelled) setReviews(list);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setEligibility({ eligible: false, reason: "sign_in", orderId: null });
      return;
    }
    fetchReviewEligibility(product.id)
      .then((next) => {
        if (!cancelled) setEligibility(next);
      })
      .catch(() => {
        if (!cancelled) {
          setEligibility({ eligible: false, reason: "unavailable", orderId: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, user?.id]);

  const avg =
    verified?.rating ??
    (reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0);
  const count = verified?.count ?? reviews.length;
  const histogram = count > 0 ? buildReviewHistogram(avg, count) : [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!eligibility?.eligible || !eligibility.orderId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const review = await submitProductReview(product.id, {
        orderId: eligibility.orderId,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      });
      setReviews((prev) => [review, ...prev]);
      setSubmitOk(true);
      setEligibility({ eligible: false, reason: "already_reviewed", orderId: null });
      setBody("");
      setTitle("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("reviews.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const eligibilityCopy = (() => {
    if (!eligibility) return t("common.loading");
    switch (eligibility.reason) {
      case "sign_in":
        return t("reviews.signInToReview");
      case "no_purchase":
        return t("reviews.buyToReview");
      case "already_reviewed":
        return t("reviews.alreadyReviewed");
      case "unavailable":
        return t("reviews.unavailable");
      default:
        return null;
    }
  })();

  return (
    <section id="pdp-reviews" className="pdp-reviews scroll-mt-24">
      <h2 className="pdp-details-heading-lg">{t("product.customerReviews")}</h2>

      {count > 0 ? (
        <div className="pdp-reviews-summary">
          <div className="pdp-reviews-score">
            <span className="pdp-reviews-avg">{avg.toFixed(1)}</span>
            <span className="text-sm text-text-muted">{t("product.outOf5")}</span>
            <StarRating rating={avg} size="md" variant="brand" />
            <Link to="#pdp-reviews" className="text-sm text-accent mt-1 inline-block hover:underline">
              {count.toLocaleString()} {t("product.globalRatings")}
            </Link>
          </div>
          <div className="pdp-reviews-bars flex-1 min-w-0">
            {histogram.map((row) => (
              <div key={row.stars} className="pdp-review-bar-row">
                <span className="pdp-review-bar-label">
                  {row.stars} {t("product.star")}
                </span>
                <div className="pdp-review-bar-track">
                  <div className="pdp-review-bar-fill" style={{ width: `${row.percent}%` }} />
                </div>
                <span className="pdp-review-bar-pct">{row.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted mt-2">
          {loaded ? t("reviews.empty") : t("common.loading")}
        </p>
      )}

      {customersSay && (
        <div className="pdp-customers-say">
          <h3 className="pdp-customers-say-title">{t("product.customersSay")}</h3>
          <p className="pdp-customers-say-text">{customersSay}</p>
          <p className="pdp-customers-say-note">{t("product.customersSayNote")}</p>
        </div>
      )}

      <div className="mt-6 pdp-review-compose">
        <h3 className="font-bold text-text mb-2">{t("reviews.write")}</h3>
        {eligibility?.eligible && eligibility.orderId && !submitOk ? (
          <form onSubmit={onSubmit} className="space-y-3 max-w-xl">
            <p className="text-xs text-text-muted">{t("reviews.verifiedOnly")}</p>
            <label className="block text-sm">
              <span className="font-medium">{t("reviews.ratingLabel")}</span>
              <select
                className="mt-1 block w-full border border-border rounded-md px-3 py-2"
                value={rating}
                onChange={(e) => setFormRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} ★
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t("reviews.titleLabel")}</span>
              <input
                className="mt-1 block w-full border border-border rounded-md px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t("reviews.bodyLabel")}</span>
              <textarea
                className="mt-1 block w-full border border-border rounded-md px-3 py-2 min-h-[100px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={4000}
                required
              />
            </label>
            {submitError && <p className="text-sm text-red-700">{submitError}</p>}
            <button type="submit" className="btn-primary" disabled={submitting || body.trim().length < 1}>
              {submitting ? t("common.loading") : t("reviews.submit")}
            </button>
          </form>
        ) : (
          <p className="text-sm text-text-muted">
            {submitOk ? t("reviews.thanks") : eligibilityCopy}
            {!user && (
              <>
                {" "}
                <Link to="/account" className="text-accent hover:underline">
                  {t("auth.signIn")}
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      {reviews.length > 0 && (
        <>
          <h3 className="font-bold text-text mb-4 mt-6">{t("product.topReviews")}</h3>
          <ul className="space-y-6">
            {reviews.map((review) => (
              <li key={review.id} className="pdp-review-card scroll-mt-24">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <StarRating rating={review.rating} size="sm" variant="brand" />
                  {review.title && (
                    <span className="font-semibold text-sm text-text">{review.title}</span>
                  )}
                  {review.verified_purchase !== false && (
                    <span className="pdp-verified-badge">{t("reviews.verifiedPurchase")}</span>
                  )}
                </div>
                <p className="text-sm text-text leading-relaxed">{review.body}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Category, Product } from "../types/product";
import {
  CATEGORY_GROUPS,
  getCategoryBannerImage,
  getCategoryById,
  productMatchesCategory,
} from "../data/categories";
import { CategoryImage } from "./CategoryImage";
import { StarRating } from "./StarRating";
import { resolveImageUrl } from "../utils/imageUrl";

type Props = {
  category: Category;
  products: Product[];
  variant?: "tile" | "card";
};

export function CategoryTile({ category, products, variant = "tile" }: Props) {
  const { t } = useTranslation();
  const catId = category.id;
  const inCategory = products.filter((p) =>
    productMatchesCategory(p.category, catId)
  );
  const count = inCategory.length;
  const preview = inCategory[0];
  const bannerSrc = getCategoryBannerImage(category, preview?.image);
  const thumbs = inCategory.slice(0, 4);
  const avgRating =
    count > 0
      ? inCategory.reduce((sum, p) => sum + p.rating, 0) / count
      : 0;
  const totalReviews = inCategory.reduce((sum, p) => sum + p.reviewCount, 0);
  const primeCount = inCategory.filter((p) => p.prime).length;

  const catDef = getCategoryById(catId);
  const group = catDef
    ? CATEGORY_GROUPS.find((g) => g.id === catDef.group)
    : null;

  const isCard = variant === "card";
  const rootClass = isCard ? "category-card-full group" : "category-tile group";

  return (
    <Link to={`/category/${catId}`} className={rootClass}>
      <div className={isCard ? "category-tile-media-wrap category-tile-media-wrap--card" : "category-tile-media-wrap"}>
        {bannerSrc ? (
          <CategoryImage
            src={bannerSrc}
            alt={t(`categories.names.${catId}`, { defaultValue: category.name })}
            variant={isCard ? "card" : "tile"}
          />
        ) : (
          <div className={isCard ? "category-card-full-media" : "category-tile-media"}>
            <span className="category-tile-placeholder" aria-hidden>
              {category.icon}
            </span>
          </div>
        )}

        {thumbs.length > 1 && (
          <div className="category-tile-thumbs" aria-hidden>
            {thumbs.map((p) => (
              <div key={p.id} className="category-tile-thumb">
                {p.image ? (
                  <img
                    src={resolveImageUrl(p.image)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="text-sm opacity-40">{category.icon}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="category-tile-body">
        {group && (
          <p className="category-tile-eyebrow">
            {t(group.labelKey)}
          </p>
        )}

        <div className="category-tile-title-wrap">
          <span className="category-tile-title-icon" aria-hidden>
            {category.icon}
          </span>
          <h3 className="category-tile-title">
            {t(`categories.names.${catId}`, { defaultValue: category.name })}
          </h3>
        </div>

        {count > 0 && avgRating > 0 && (
          <div className="category-tile-rating">
            <StarRating rating={avgRating} size="sm" />
            <span className="category-tile-rating-count">
              {avgRating.toFixed(1)}
            </span>
            {totalReviews > 0 && (
              <span className="category-tile-rating-reviews">
                ({totalReviews.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {primeCount > 0 && (
          <p className="category-tile-meta">
            <span className="category-tile-prime-hint">{t("common.prime")}</span>
          </p>
        )}

        <div className="category-tile-badges">
          {primeCount > 0 && (
            <span className="category-tile-badge category-tile-badge--prime">
              {t("common.prime")}
            </span>
          )}
          {inCategory.some((p) => p.originalPrice) && (
            <span className="category-tile-badge category-tile-badge--deal">
              {t("categoryTile.deals")}
            </span>
          )}
        </div>

        <span className="category-tile-cta">
          {t("common.shopNow")}
          <svg className="category-tile-cta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

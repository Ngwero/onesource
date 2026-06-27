import { Link } from "react-router-dom";
import type { Product } from "../../types/product";
import { ProductCard } from "../ProductCard";

type Props = {
  sectionId: string;
  title: string;
  subtitle: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
};

export function ProductRecommendationSection({
  sectionId,
  title,
  subtitle,
  products,
  viewAllHref,
  viewAllLabel,
  className = "pdp-related-section",
}: Props) {
  if (products.length === 0) return null;

  return (
    <section
      className={className}
      aria-labelledby={sectionId}
    >
      <div className="page-container pdp-related-header">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 id={sectionId} className="pdp-related-title">
              {title}
            </h2>
            <p className="pdp-related-subtitle">{subtitle}</p>
          </div>
          {viewAllHref && viewAllLabel && (
            <Link
              to={viewAllHref}
              className="text-sm font-semibold text-accent hover:underline whitespace-nowrap shrink-0"
            >
              {viewAllLabel} →
            </Link>
          )}
        </div>
      </div>

      <div className="page-container pdp-related-grid-wrap">
        <div className="pdp-related-grid" role="list">
          {products.map((product) => (
            <div key={product.id} className="pdp-related-grid-item" role="listitem">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

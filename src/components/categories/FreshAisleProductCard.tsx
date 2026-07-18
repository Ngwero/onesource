import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { useCurrency } from "../../context/CurrencyContext";
import { useCart } from "../../context/CartContext";
import { StarRating } from "../StarRating";
import { ProductImage } from "../ProductImage";
import { useLocalizedProduct } from "../../i18n/useLocalizedProduct";
import { formatCardUnitPrice } from "../../utils/productDetails";
import { isExportProduct } from "../../utils/exportOrder";

type Props = {
  product: Product;
  /** i18n key for the action button label (defaults to "Add to basket"). */
  actionLabelKey?: string;
  /** Eager-load image for above-the-fold aisle items. */
  priority?: boolean;
};

export function FreshAisleProductCard({
  product,
  actionLabelKey,
  priority = false,
}: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const localized = useLocalizedProduct(product);
  const exportProduct = isExportProduct(product);
  const resolvedActionLabel =
    actionLabelKey ??
    (exportProduct ? "checkout.placeOrder" : "common.addToBasket");

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;
  const unitPrice = formatCardUnitPrice(product, formatPrice, t);

  return (
    <article className="fresh-aisle-card">
      <Link to={`/product/${product.id}`} className="fresh-aisle-card-image-link">
        <ProductImage
          src={product.image}
          alt={localized.localizedTitle}
          size="card"
          className="fresh-aisle-card-image"
          priority={priority}
        />
      </Link>

      <Link to={`/product/${product.id}`} className="fresh-aisle-card-body">
        <div className="fresh-aisle-card-price-block">
          <span className="fresh-aisle-card-price">{formatPrice(product.price)}</span>
          {unitPrice && <span className="fresh-aisle-card-unit">{unitPrice}</span>}
        </div>

        <div className="fresh-aisle-card-was-row">
          {product.originalPrice != null && product.originalPrice > product.price && (
            <p className="fresh-aisle-card-was">
              <span className="fresh-aisle-card-was-label">{t("productCard.rrp")}:</span>{" "}
              <span className="fresh-aisle-card-was-value">{formatPrice(product.originalPrice)}</span>
              {discount > 0 && (
                <span className="fresh-aisle-card-off">{t("product.savePercent", { percent: discount })}</span>
              )}
            </p>
          )}
        </div>

        <h3 className="fresh-aisle-card-title">{localized.localizedTitle}</h3>

        <div className="fresh-aisle-card-rating">
          <span className="fresh-aisle-card-rating-num">{product.rating.toFixed(1)}</span>
          <StarRating rating={product.rating} size="sm" variant="brand" />
          <span className="fresh-aisle-card-reviews">
            {product.reviewCount.toLocaleString()}
          </span>
        </div>
      </Link>

      <button
        type="button"
        className="fresh-aisle-card-add"
        disabled={!product.inStock}
        onClick={() => {
          addToCart(product, 1, { openBasket: !exportProduct });
          if (exportProduct) navigate("/exports/confirmation");
        }}
      >
        {t(resolvedActionLabel)}
      </button>
    </article>
  );
}

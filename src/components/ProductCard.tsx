import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import type { Product } from "../types/product";
import { useCurrency } from "../context/CurrencyContext";
import { StarRating } from "./StarRating";
import { ProductImage } from "./ProductImage";
import { useCart } from "../context/CartContext";
import { useLocalizedProduct } from "../i18n/useLocalizedProduct";
import { SaveProductButton } from "./SaveProductButton";
import {
  formatCardUnitPrice,
  getBestSellerBadge,
  getBoughtInPastMonth,
  getCardDeliveryDate,
} from "../utils/productDetails";

type Props = { product: Product };

export function ProductCard({ product }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const localized = useLocalizedProduct(product);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const socialProof = getBoughtInPastMonth(product, t);
  const bestSeller = getBestSellerBadge(product, t);
  const unitPrice = formatCardUnitPrice(product, formatPrice, t);
  const deliveryDate = getCardDeliveryDate(i18n.language);

  return (
    <article className="product-card">
      <SaveProductButton productId={product.id} className="product-card-save-btn" />
      <Link to={`/product/${product.id}`} className="product-card-link">
        <ProductImage
          src={product.image}
          alt={localized.localizedTitle}
          size="card"
          className="product-card-image"
        />

        <div className="product-card-body">
          <h3 className="product-card-title">{localized.localizedTitle}</h3>

          <div className="product-card-ratings">
            <StarRating rating={product.rating} variant="brand" />
            <span className="product-card-review-count">
              {product.reviewCount.toLocaleString()}
            </span>
          </div>

          {socialProof && <p className="product-card-social">{socialProof}</p>}

          {bestSeller && (
            <span className="product-card-bestseller">{bestSeller}</span>
          )}

          <div className="product-card-price-row">
            {discount > 0 && (
              <span className="product-card-discount">-{discount}%</span>
            )}
            <span className="product-card-price">{formatPrice(product.price)}</span>
            {unitPrice && <span className="product-card-unit-price">{unitPrice}</span>}
          </div>

          {product.originalPrice != null && product.originalPrice > product.price && (
            <p className="product-card-rrp">
              {t("productCard.rrp")}:{" "}
              <span className="product-card-rrp-value">
                {formatPrice(product.originalPrice)}
              </span>
            </p>
          )}

          {product.prime && product.inStock && (
            <div className="product-card-delivery">
              <span className="product-card-prime">{t("common.prime")}</span>
              <span className="product-card-delivery-text">
                {t("productCard.freeDelivery")}{" "}
                <span className="product-card-delivery-date">
                  {t("productCard.getIt")} {deliveryDate}
                </span>
              </span>
            </div>
          )}

          {!product.prime && product.inStock && localized.localizedDelivery && (
            <p className="product-card-delivery-simple">{localized.localizedDelivery}</p>
          )}

          {!product.inStock && (
            <p className="product-card-out-of-stock">{t("common.outOfStock")}</p>
          )}
        </div>
      </Link>

      <div className="product-card-actions">
        <button
          type="button"
          disabled={!product.inStock}
          onClick={() => addToCart(product)}
          className="product-card-basket-btn"
        >
          {t("common.addToBasket")}
        </button>
      </div>
    </article>
  );
}

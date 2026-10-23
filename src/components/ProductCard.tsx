import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { useCurrency } from "../context/CurrencyContext";
import { CardRating } from "./CardRating";
import { ProductImage } from "./ProductImage";
import { useCart } from "../context/CartContext";
import { useLocalizedProduct } from "../i18n/useLocalizedProduct";
import { SaveProductButton } from "./SaveProductButton";
import { isExportProduct } from "../utils/exportOrder";
import { formatCardUnitPrice } from "../utils/productDetails";
import { productCardFacts } from "../utils/productCardFacts";
import { ProductCheckoutActions } from "./product/ProductCheckoutActions";

type Props = {
  product: Product;
  /** i18n key for the export Place order button. */
  actionLabelKey?: string;
  priority?: boolean;
};

/** Shared listing card for every shop, grid, shelf and recommendation row. */
export function ProductCard({ product, actionLabelKey, priority = false }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const localized = useLocalizedProduct(product);
  const title = localized.localizedTitle.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const exportProduct = isExportProduct(product);
  const resolvedActionLabel = actionLabelKey ??
    (exportProduct ? "checkout.placeOrder" : "common.addToBasket");
  const { available, discount, lowStock, brand, supplier, size } = productCardFacts(product);
  const unitPrice = formatCardUnitPrice(product, formatPrice, t);

  return (
    <article className="product-card">
      <SaveProductButton productId={product.id} className="product-card-save-btn" />
      <Link to={`/product/${product.id}`} className="product-card-link">
        <ProductImage
          src={product.image}
          alt={title}
          size="card"
          className="product-card-image"
          priority={priority}
        />
        <div className="product-card-body">
          {brand && <p className="product-card-brand">{brand}</p>}
          <h3 className="product-card-title" title={title}>{title}</h3>
          {size && <p className="product-card-size">{size}</p>}
          <CardRating product={product} showAverage />

          <div className="product-card-price-row">
            {discount > 0 && <span className="product-card-discount">-{discount}%</span>}
            <span className="product-card-price">{formatPrice(product.price)}</span>
            {unitPrice && <span className="product-card-unit-price">{unitPrice}</span>}
          </div>
          {product.originalPrice != null && product.originalPrice > product.price && (
            <p className="product-card-rrp">
              {t("productCard.rrp")}: <span className="product-card-rrp-value">{formatPrice(product.originalPrice)}</span>
            </p>
          )}

          {available && (product.prime || localized.localizedDelivery) && (
            <div className="product-card-delivery">
              {product.prime && <span className="product-card-prime">✓ {t("common.prime")}</span>}
              {localized.localizedDelivery && <span className="product-card-delivery-text">{localized.localizedDelivery}</span>}
            </div>
          )}
          <p className={available ? (lowStock ? "product-card-low-stock" : "product-card-in-stock") : "product-card-out-of-stock"}>
            {!available ? t("common.outOfStock") : lowStock != null
              ? t("productDetails.values.stockAvailable", { count: lowStock })
              : t("product.inStock")}
          </p>
          {supplier && <p className="product-card-seller">{t("product.soldBy")} {supplier}</p>}
        </div>
      </Link>
      <div className="product-card-actions">
        {exportProduct ? (
          <button
            type="button"
            disabled={!available}
            onClick={() => {
              addToCart(product, 1, { openBasket: false });
              navigate("/exports/confirmation");
            }}
            className="product-card-basket-btn"
          >
            {t(available ? resolvedActionLabel : "common.outOfStock")}
          </button>
        ) : (
          <ProductCheckoutActions
            disabled={!available}
            onAdd={() => addToCart(product, 1)}
            onPayNow={() => {
              addToCart(product, 1, { openBasket: false });
              navigate("/checkout");
            }}
          />
        )}
      </div>
    </article>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { useCurrency } from "../../context/CurrencyContext";
import { useCart } from "../../context/CartContext";
import { ProductImage } from "../ProductImage";
import { useLocalizedProduct } from "../../i18n/useLocalizedProduct";

type Props = {
  product: Product;
  priority?: boolean;
};

function stripHtml(text: string) {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*[–—-]\s*One Source\s*$/i, "")
    .trim();
}

export function CosmeticsProductCard({ product, priority = false }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const localized = useLocalizedProduct(product);
  const title = stripHtml(localized.localizedTitle);
  const onSale = product.originalPrice != null && product.originalPrice > product.price;
  const discount = onSale
    ? Math.round((1 - product.price / product.originalPrice!) * 100)
    : 0;
  const href = `/product/${product.id}`;
  const portraitPhoto = !product.id.includes("-boots-");

  return (
    <article className={`cos-card${portraitPhoto ? " cos-card--fill" : ""}`}>
      <div className="cos-card-media">
        <Link to={href} tabIndex={-1} aria-hidden>
          <ProductImage
            src={product.image}
            alt=""
            size="card"
            className="cos-card-image"
            priority={priority}
          />
        </Link>
        {discount > 0 && <span className="cos-card-badge">-{discount}%</span>}
        <button
          type="button"
          className="cos-card-add"
          disabled={!product.inStock}
          onClick={() => addToCart(product, 1, { openBasket: true })}
        >
          {product.inStock ? t("common.addToBasket") : t("common.outOfStock")}
        </button>
      </div>

      <Link to={href} className="cos-card-name" title={title}>
        {title}
      </Link>
      <p className="cos-card-price">
        {onSale && <s>{formatPrice(product.originalPrice!)}</s>}
        <span className={onSale ? "is-sale" : undefined}>{formatPrice(product.price)}</span>
      </p>
    </article>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { useCurrency } from "../../context/CurrencyContext";
import { useCart } from "../../context/CartContext";
import { ProductImage } from "../ProductImage";
import { CardRating } from "../CardRating";
import { useLocalizedProduct } from "../../i18n/useLocalizedProduct";
import { isCosmeticsProduct } from "../../utils/cosmeticsMode";

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Drop a leading brand so the title line is the product name. */
function titleWithoutBrand(title: string, brand: string | null) {
  if (!brand) return title;
  const stripped = title.replace(new RegExp(`^${escapeRegExp(brand)}(?:\\s*[:–—-])?\\s+`, "i"), "").trim();
  return stripped || title;
}

function measureLabel(value: string | undefined | null) {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text || /^each$/i.test(text)) return null;
  const match = text.match(/\d+(?:[.,]\d+)?\s?(?:ml|cl|fl\.?\s?oz|oz|kg|g|l|mm|cm)\b/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : null;
}

/** A real size, or a short shade/pack note already written on the product. */
function cosmeticVariant(product: Product, title: string) {
  const fromSpecs = product.details?.specs?.find((spec) => {
    const key = spec.key.toLowerCase();
    const label = spec.label.toLowerCase();
    return key === "size" || key === "volume" || key === "weight" || label === "size" || label === "volume";
  });
  const fromDetails =
    measureLabel(fromSpecs?.value) ||
    measureLabel(product.unit) ||
    measureLabel(product.details?.unit) ||
    measureLabel(title);
  if (fromDetails) return fromDetails;
  const note = title.match(/\(([^)]{2,48})\)\s*$/)?.[1]?.trim();
  if (note && /shade|colour|color|scent|fragrance|size|pack|pair/i.test(note)) return note;
  return null;
}

export function CosmeticsProductCard({ product, priority = false }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const localized = useLocalizedProduct(product);
  const title = stripHtml(localized.localizedTitle);
  const brand = product.details?.brand?.trim() || null;
  const onSale = product.originalPrice != null && product.originalPrice > product.price;
  const discount = onSale
    ? Math.round((1 - product.price / product.originalPrice!) * 100)
    : 0;
  const href = `/product/${product.id}`;
  const portraitPhoto = !product.id.includes("-boots-") && !product.id.startsWith("pharmacy-");
  const shelfPhoto = product.id.startsWith("pharmacy-");
  const cartBelow = isCosmeticsProduct(product);
  const displayTitle = cartBelow ? titleWithoutBrand(title, brand) : title;
  const variant = cartBelow ? cosmeticVariant(product, title) : null;
  const fact = !cartBelow
    ? null
    : !product.inStock
      ? t("common.outOfStock")
      : variant || t("product.inStock");
  const addButton = (
    <button
      type="button"
      className="cos-card-add"
      disabled={!product.inStock}
      onClick={() => addToCart(product, 1, { openBasket: true })}
    >
      {product.inStock ? t("common.addToBasket") : t("common.outOfStock")}
    </button>
  );

  return (
    <article
      className={`cos-card${portraitPhoto ? " cos-card--fill" : ""}${shelfPhoto ? " cos-card--shelf" : ""}${cartBelow ? " cos-card--cart-below" : ""}`}
    >
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
        {!cartBelow && addButton}
      </div>

      {cartBelow && brand && (
        <Link to={href} className="cos-card-brand" tabIndex={-1}>
          {brand}
        </Link>
      )}
      <Link to={href} className="cos-card-name" title={title}>
        {displayTitle}
      </Link>
      <CardRating product={product} className="cos-card-rating" />
      <p className="cos-card-price">
        {cartBelow ? (
          <>
            <span className={onSale ? "is-sale" : undefined}>{formatPrice(product.price)}</span>
            {onSale && <s>{formatPrice(product.originalPrice!)}</s>}
          </>
        ) : (
          <>
            {onSale && <s>{formatPrice(product.originalPrice!)}</s>}
            <span className={onSale ? "is-sale" : undefined}>{formatPrice(product.price)}</span>
          </>
        )}
      </p>
      {fact && (
        <p className={`cos-card-fact${product.inStock ? (variant ? " is-size" : " is-stock") : " is-out"}`}>
          {fact}
        </p>
      )}
      {cartBelow && addButton}
    </article>
  );
}

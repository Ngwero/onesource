import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { useCurrency } from "../../context/CurrencyContext";
import { useCart } from "../../context/CartContext";
import { ProductImage } from "../ProductImage";
import { useLocalizedProduct } from "../../i18n/useLocalizedProduct";
import { parseKitchenListingTitle } from "../../data/kitchenWare";

type Props = {
  product: Product;
  priority?: boolean;
};

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M6.5 9.5h11l-.7 9.1a1.75 1.75 0 0 1-1.75 1.65H8.95a1.75 1.75 0 0 1-1.75-1.65L6.5 9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 9.5V7.75A3 3 0 0 1 12 4.75a3 3 0 0 1 3 3V9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCartPlus() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M7.5 7.5h12.2l-1.1 8.2a1.75 1.75 0 0 1-1.73 1.52H9.35a1.75 1.75 0 0 1-1.73-1.48L6.2 4.75H3.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM17.25 20.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
        fill="currentColor"
      />
      <path
        d="M15.25 10.25v4M13.25 12.25h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KitchenIkeaProductCard({ product, priority = false }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const localized = useLocalizedProduct(product);
  const { series, facts } = parseKitchenListingTitle(localized.localizedTitle);

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

  const isNew =
    discount === 0 &&
    (product.id.includes("madein") ||
      (product.rating >= 4.7 && product.reviewCount < 50));

  const hasMoreOptions =
    product.id.includes("madein") ||
    /\d+\s*(cm|mm|l|litre|liter|piece|pack|set)\b/i.test(
      `${series} ${facts}`
    );

  const unit = localized.localizedUnit.replace(/^per\s+/i, "");

  return (
    <article className="kitchen-ikea-card">
      <Link
        to={`/product/${product.id}`}
        className="kitchen-ikea-card-media"
        aria-label={localized.localizedTitle}
      >
        <ProductImage
          src={product.image}
          alt={localized.localizedTitle}
          size="card"
          className="kitchen-ikea-card-image"
          priority={priority}
        />
      </Link>

      <div className="kitchen-ikea-card-body">
        {isNew ? (
          <span className="kitchen-ikea-card-new">{t("categories.fresh.newBadge")}</span>
        ) : null}

        <Link to={`/product/${product.id}`} className="kitchen-ikea-card-copy">
          <span className="kitchen-ikea-card-series-row">
            <strong className="kitchen-ikea-card-series">{series}</strong>
            <span className="kitchen-ikea-card-bag" aria-hidden>
              <IconBag />
            </span>
          </span>
          {facts ? <span className="kitchen-ikea-card-facts">{facts}</span> : null}
        </Link>

        <div className="kitchen-ikea-card-pricing">
          {product.originalPrice != null &&
            product.originalPrice > product.price && (
              <span className="kitchen-ikea-card-was">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          <div className="kitchen-ikea-card-price-row">
            <span className="kitchen-ikea-card-price">
              {formatPrice(product.price)}
            </span>
            <span className="kitchen-ikea-card-unit">/{unit}</span>
            {discount > 0 && (
              <span className="kitchen-ikea-card-off">-{discount}%</span>
            )}
          </div>
        </div>

        {hasMoreOptions ? (
          <Link
            to={`/product/${product.id}`}
            className="kitchen-ikea-card-options"
          >
            {t("kitchen.moreOptions")}
          </Link>
        ) : (
          <span className="kitchen-ikea-card-options kitchen-ikea-card-options--spacer" />
        )}

        <div className="kitchen-ikea-card-actions">
          <Link
            to={`/product/${product.id}`}
            className="kitchen-ikea-icon-btn"
            aria-label={t("kitchen.quickView")}
            title={t("kitchen.quickView")}
          >
            <IconEye />
          </Link>
          <button
            type="button"
            className="kitchen-ikea-icon-btn kitchen-ikea-icon-btn--cart"
            disabled={!product.inStock}
            aria-label={t("common.addToBasket")}
            title={t("common.addToBasket")}
            onClick={() => {
              addToCart(product, 1, { openBasket: true });
            }}
          >
            <IconCartPlus />
          </button>
        </div>
      </div>
    </article>
  );
}

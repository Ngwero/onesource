import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import type { Product } from "../../types/product";
import type { LocalizedProduct } from "../../i18n/useLocalizedProduct";

type Props = {
  product: Product;
  localized: LocalizedProduct;
  quantity: number;
  onQuantityChange: (n: number) => void;
  qtyOptions: number[];
  onAdd: () => void;
  onToggleList: () => void;
  onList: boolean;
  formatPrice: (n: number) => string;
  freeDeliveryThreshold: number;
  variant?: "sidebar" | "compact";
};

export function ProductBuyBox({
  product,
  localized,
  quantity,
  onQuantityChange,
  qtyOptions,
  onAdd,
  onToggleList,
  onList,
  formatPrice,
  freeDeliveryThreshold,
  variant = "sidebar",
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const compact = variant === "compact";
  const returnsTo = user ? "/orders" : "/login";
  const returnsState = user ? undefined : { from: "/orders" };

  return (
    <div className={`pdp-buy-panel ${compact ? "pdp-buy-panel--compact" : ""}`}>
      <p className="pdp-buy-price">{formatPrice(product.price)}</p>
      <p className="pdp-buy-unit">
        {t("product.pricePerUnit", {
          price: formatPrice(product.price),
          unit: localized.localizedUnit,
        })}
      </p>

      <p className={`pdp-stock ${product.inStock ? "in-stock" : ""}`}>
        {product.inStock ? t("product.inStock") : t("common.outOfStock")}
      </p>

      {!compact && (
        <div className="pdp-delivery-box">
          <p className="font-semibold text-text text-sm">{t("product.freeDelivery")}</p>
          <p className="text-sm text-text-muted mt-1">{localized.localizedDelivery}</p>
          <p className="text-sm text-text-muted mt-1">
            {t("product.deliveryTo")}{" "}
            <span className="font-semibold text-text">{t("product.uganda")}</span>
          </p>
          {product.prime && (
            <p className="text-xs text-text-muted mt-2">
              <span className="font-bold text-prime">{t("common.prime")}</span>
              {" · "}
              {t("cart.freeSameDay")} {formatPrice(freeDeliveryThreshold)}+
            </p>
          )}
        </div>
      )}

      <div className="pdp-qty-row">
        <label htmlFor={compact ? "pdp-qty-mobile" : "pdp-qty"}>{t("product.quantityLabel")}</label>
        <select
          id={compact ? "pdp-qty-mobile" : "pdp-qty"}
          value={quantity}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
        >
          {qtyOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="pdp-buy-actions">
        <button type="button" disabled={!product.inStock} onClick={onAdd} className="pdp-btn-cart">
          {t("common.addToBasket")}
        </button>
        {!compact && (
          <button
            type="button"
            onClick={onToggleList}
            className={`pdp-btn-list ${onList ? "pdp-btn-list--saved" : ""}`}
          >
            {onList ? t("lists.removeFromList") : t("lists.addToList")}
          </button>
        )}
      </div>

      {!compact && (
        <>
          <dl className="pdp-buy-meta">
            <div>
              <dt>{t("product.shipFrom")}</dt>
              <dd>{t("product.soldValue")}</dd>
            </div>
            <div>
              <dt>{t("product.soldBy")}</dt>
              <dd className="text-accent">{t("product.soldValue")}</dd>
            </div>
            <div>
              <dt>{t("product.returns")}</dt>
              <dd>
                <Link to={returnsTo} state={returnsState} className="hover:underline text-accent">
                  {t("product.returnsPolicy")}
                </Link>
              </dd>
            </div>
          </dl>

          <p className="text-[11px] text-text-muted text-center mt-2">{t("product.secureTransaction")}</p>
        </>
      )}
    </div>
  );
}

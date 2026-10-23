import { useTranslation } from "react-i18next";

type Props = {
  disabled?: boolean;
  onAdd: () => void;
  onPayNow: () => void;
};

/** Shared pair: plus adds to basket; Pay now adds and goes to checkout. */
export function ProductCheckoutActions({ disabled, onAdd, onPayNow }: Props) {
  const { t } = useTranslation();

  return (
    <div className="cos-checkout-actions">
      <button
        type="button"
        className="cos-checkout-basket"
        disabled={disabled}
        onClick={onAdd}
        aria-label={t(disabled ? "common.outOfStock" : "common.addToBasket")}
      >
        <PlusIcon />
      </button>
      <button
        type="button"
        className="cos-checkout-pay"
        disabled={disabled}
        onClick={onPayNow}
      >
        {t("product.payNow")}
      </button>
    </div>
  );
}

/** @deprecated Use ProductCheckoutActions — same shared plus + Pay now pair. */
export const CosmeticsCheckoutActions = ProductCheckoutActions;

/**
 * Filled plus matching Flaticon "Plus" 2952084 (twentyfour Glyph).
 * Official SVG is account-gated; this is an original solid recreation of that
 * silhouette (axis-aligned plus with square ends) from the free PNG
 * https://cdn-icons-png.flaticon.com/512/2952/2952084.png
 * Icon: https://www.flaticon.com/free-icon/plus_2952084
 * License: Flaticon free license — personal/commercial use with attribution.
 */
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.25 3h1.5v8.25H21v1.5h-8.25V21h-1.5v-8.25H3v-1.5h8.25z" />
    </svg>
  );
}

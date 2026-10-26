import { useTranslation } from "react-i18next";

type Props = {
  disabled?: boolean;
  onAdd: () => void;
  onPayNow: () => void;
};

/** Shared pair: Add to basket adds the product; Pay now adds and goes to checkout. */
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
        {t(disabled ? "common.outOfStock" : "common.addToBasket")}
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

/** @deprecated Use ProductCheckoutActions. */
export const CosmeticsCheckoutActions = ProductCheckoutActions;

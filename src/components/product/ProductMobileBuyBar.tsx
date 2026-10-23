import { useTranslation } from "react-i18next";
import { SaveProductButton } from "../SaveProductButton";
import { ProductCheckoutActions } from "./ProductCheckoutActions";

type Props = {
  priceLabel: string;
  inStock: boolean;
  onAdd: () => void;
  onPayNow?: () => void;
  productId: string;
  actionLabelKey?: string;
};

export function ProductMobileBuyBar({
  priceLabel,
  inStock,
  onAdd,
  onPayNow,
  productId,
  actionLabelKey = "common.addToBasket",
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="pdp-mobile-bar" role="region" aria-label={t("product.mobileBuyBar")}>
      <div className="pdp-mobile-bar-price">{priceLabel}</div>
      <div className="pdp-mobile-bar-actions">
        <SaveProductButton productId={productId} size="md" className="pdp-mobile-save-btn" />
        {onPayNow ? (
          <ProductCheckoutActions disabled={!inStock} onAdd={onAdd} onPayNow={onPayNow} />
        ) : (
          <button
            type="button"
            disabled={!inStock}
            onClick={onAdd}
            className="pdp-mobile-bar-cart pdp-btn-cart"
          >
            {t(actionLabelKey)}
          </button>
        )}
      </div>
    </div>
  );
}

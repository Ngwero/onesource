import { useTranslation } from "react-i18next";
import { SaveProductButton } from "../SaveProductButton";

type Props = {
  priceLabel: string;
  inStock: boolean;
  onAdd: () => void;
  productId: string;
};

export function ProductMobileBuyBar({ priceLabel, inStock, onAdd, productId }: Props) {
  const { t } = useTranslation();

  return (
    <div className="pdp-mobile-bar" role="region" aria-label={t("product.mobileBuyBar")}>
      <div className="pdp-mobile-bar-price">{priceLabel}</div>
      <div className="pdp-mobile-bar-actions">
        <SaveProductButton productId={productId} size="md" className="pdp-mobile-save-btn" />
        <button
          type="button"
          disabled={!inStock}
          onClick={onAdd}
          className="pdp-mobile-bar-cart pdp-btn-cart"
        >
          {t("common.addToBasket")}
        </button>
      </div>
    </div>
  );
}

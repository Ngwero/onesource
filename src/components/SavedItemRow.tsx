import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { useCurrency } from "../context/CurrencyContext";
import { useLocalizedProduct } from "../i18n/useLocalizedProduct";
import { ProductImage } from "./ProductImage";
import { useSavedList } from "../context/SavedListContext";

type Props = {
  product: Product;
};

export function SavedItemRow({ product }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const localized = useLocalizedProduct(product);
  const { removeSaved } = useSavedList();

  return (
    <div className="saved-item-row card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full min-w-0">
      <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
        <Link
          to={`/product/${product.id}`}
          className="flex-shrink-0 rounded-xl overflow-hidden border border-border"
        >
          <ProductImage
            src={product.image}
            alt={localized.localizedTitle}
            size="thumb"
          />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col">
          <Link
            to={`/product/${product.id}`}
            className="font-medium text-sm sm:text-base text-text hover:text-accent transition-colors line-clamp-2"
          >
            {localized.localizedTitle}
          </Link>
          <span className="text-lg font-bold text-text mt-2 sm:mt-3">
            {formatPrice(product.price)}
          </span>
          <div className="mt-auto pt-2 sm:pt-3 flex items-center gap-3 flex-wrap">
            <Link
              to={`/product/${product.id}`}
              className="text-sm font-semibold text-accent hover:underline min-h-[44px] inline-flex items-center"
            >
              {t("lists.viewProduct")}
            </Link>
            <button
              type="button"
              onClick={() => removeSaved(product.id)}
              className="text-sm text-deal hover:underline font-medium min-h-[44px] px-1"
            >
              {t("common.remove")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { getCategoryDisplayName } from "../data/categories";
import { localizedProductField } from "./productTranslate";

export type LocalizedProduct = Product & {
  localizedTitle: string;
  localizedDescription: string;
  localizedDelivery: string;
  localizedUnit: string;
};

export function useLocalizedProduct(product: Product): LocalizedProduct {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return {
    ...product,
    localizedTitle: localizedProductField(product, t, "title", lang),
    localizedDescription: localizedProductField(product, t, "description", lang),
    localizedDelivery: localizedProductField(product, t, "delivery", lang),
    localizedUnit: t(`units.${product.unit}`, { defaultValue: product.unit }),
  };
}

/** Use outside React (e.g. checkout) when you have `t` and language. */
export function getLocalizedProductFields(
  product: Product,
  t: ReturnType<typeof useTranslation>["t"],
  lang: string
) {
  return {
    localizedTitle: localizedProductField(product, t, "title", lang),
    localizedDescription: localizedProductField(product, t, "description", lang),
    localizedDelivery: localizedProductField(product, t, "delivery", lang),
  };
}

export function useCategoryName(categoryId: string): string {
  const { t } = useTranslation();
  return getCategoryDisplayName(categoryId, (key, opts) =>
    t(key, { defaultValue: opts?.defaultValue })
  );
}

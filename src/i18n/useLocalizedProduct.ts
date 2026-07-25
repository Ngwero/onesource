import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { getCategoryDisplayName } from "../data/categories";
import {
  aisleIdFromProductId,
  KITCHEN_WARE_AISLES,
} from "../data/kitchenWare";
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

export function getKitchenAisleTitle(
  aisleId: string,
  t: ReturnType<typeof useTranslation>["t"],
  fallback?: string
): string {
  const english =
    fallback ??
    KITCHEN_WARE_AISLES.find((a) => a.id === aisleId)?.title ??
    aisleId;
  return t(`kitchen.aisles.${aisleId}`, { defaultValue: english });
}

export function useKitchenAisleTitle(aisleId: string): string {
  const { t } = useTranslation();
  return getKitchenAisleTitle(aisleId, t);
}

export function getKitchenAisleTitleFromProductId(
  productId: string,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  const id = aisleIdFromProductId(productId);
  if (!id) {
    return t("kitchen.aisles.organization", {
      defaultValue: "Organization in the kitchen",
    });
  }
  return getKitchenAisleTitle(id, t);
}

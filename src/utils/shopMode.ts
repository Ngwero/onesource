import { KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWare";
import { COSMETICS_CATEGORY_ID } from "../data/cosmetics";
import { PHARMACY_CATEGORY_ID } from "../data/pharmacy";
import type { Product } from "../types/product";
import { excludeExportCatalogue } from "./exportOrder";
import { isKitchenPath, isKitchenProduct } from "./kitchenMode";
import { isCosmeticsPath, isCosmeticsProduct } from "./cosmeticsMode";
import { isPharmacyPath, isPharmacyProduct } from "./pharmacyMode";

export type ShopMode = "fresh" | "kitchen" | "cosmetics" | "pharmacy";

/** Category ids that have their own shop and never appear in Fresh listings. */
export const SPECIALTY_SHOP_CATEGORY_IDS = new Set<string>([
  KITCHEN_WARE_CATEGORY_ID,
  COSMETICS_CATEGORY_ID,
  PHARMACY_CATEGORY_ID,
]);

export function shopModeForPath(pathname: string): ShopMode {
  if (isPharmacyPath(pathname)) return "pharmacy";
  if (isCosmeticsPath(pathname)) return "cosmetics";
  if (isKitchenPath(pathname)) return "kitchen";
  return "fresh";
}

/** Infer shop from SKU prefix when the product object is not loaded yet. */
export function shopModeForProductId(productId: string): ShopMode {
  if (productId.startsWith("pharmacy-")) return "pharmacy";
  if (productId.startsWith("cosmetics-")) return "cosmetics";
  if (productId.startsWith("kitchen-")) return "kitchen";
  return "fresh";
}

export function shopModeForProduct(product: Product | null | undefined): ShopMode {
  if (!product) return "fresh";
  if (isPharmacyProduct(product)) return "pharmacy";
  if (isCosmeticsProduct(product)) return "cosmetics";
  if (isKitchenProduct(product)) return "kitchen";
  return shopModeForProductId(String(product.id));
}

export function isSpecialtyProduct(product: Product | null | undefined): boolean {
  return isKitchenProduct(product) || isCosmeticsProduct(product) || isPharmacyProduct(product);
}

/** Fresh produce listings should never include Kitchen or Cosmetics SKUs. */
export function excludeSpecialtyProducts(products: Product[]): Product[] {
  return products.filter((product) => !isSpecialtyProduct(product));
}

/** Fresh All products: produce and livestock only — not export sodas or other shops. */
export function excludeNonFreshProduce(products: Product[]): Product[] {
  return excludeExportCatalogue(excludeSpecialtyProducts(products));
}

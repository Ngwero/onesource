import { PHARMACY_AISLES, PHARMACY_CATEGORY_ID, pharmacyAisleIdFromProductId } from "../data/pharmacy";
import type { Product } from "../types/product";

export function pharmacyAislePath(id: string) {
  return `/pharmacy/aisle/${id}`;
}

export function isPharmacyPath(pathname: string): boolean {
  return pathname === "/pharmacy" || pathname.startsWith("/pharmacy/") || pathname.startsWith("/product/pharmacy-");
}

export function isPharmacyProduct(product: Product | null | undefined): boolean {
  if (!product) return false;
  return product.id.startsWith("pharmacy-") || product.category === PHARMACY_CATEGORY_ID;
}

export function isValidPharmacyAisleId(id: string | undefined): boolean {
  return PHARMACY_AISLES.some((aisle) => aisle.id === id);
}

export { pharmacyAisleIdFromProductId };

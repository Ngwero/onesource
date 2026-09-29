import {
  COSMETICS_AISLES,
  COSMETICS_CATEGORY_ID,
  cosmeticsAisleIdFromProductId,
  type CosmeticsAisleId,
} from "../data/cosmetics";
import { productMatchesCategory } from "../data/categories";
import type { Product } from "../types/product";

export function isCosmeticsPath(pathname: string): boolean {
  if (pathname === "/cosmetics" || pathname.startsWith("/cosmetics/")) return true;
  return /^\/product\/cosmetics-/.test(pathname);
}

export function isCosmeticsProduct(product: Product | null | undefined): boolean {
  if (!product) return false;
  if (String(product.id).startsWith("cosmetics-")) return true;
  return productMatchesCategory(product.category, COSMETICS_CATEGORY_ID);
}

export function cosmeticsAislePath(aisleId: string): string {
  return `/cosmetics/aisle/${aisleId}`;
}

export function groupCosmeticsByAisle(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const aisle of COSMETICS_AISLES) groups.set(aisle.id, []);

  for (const product of products) {
    const id = cosmeticsAisleIdFromProductId(product.id);
    if (!id) continue;
    groups.get(id)!.push(product);
  }

  return COSMETICS_AISLES.map((aisle) => ({
    ...aisle,
    products: groups.get(aisle.id) ?? [],
  }));
}

export function filterCosmeticsAisle(products: Product[], aisleId: string): Product[] {
  return products.filter((product) => cosmeticsAisleIdFromProductId(product.id) === aisleId);
}

export function isValidCosmeticsAisleId(
  id: string | undefined | null
): id is CosmeticsAisleId {
  if (!id) return false;
  return COSMETICS_AISLES.some((a) => a.id === id);
}

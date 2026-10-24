import { normalizeCategoryId } from "../data/categories";
import type { Product } from "../types/product";

export const EXPORT_CATEGORY_ID = "export-fresh-produce";

export function isExportProduct(product: Product | { category: string }): boolean {
  return normalizeCategoryId(product.category) === EXPORT_CATEGORY_ID;
}

/** Soft drinks and other export-aisle SKUs — Place order cards, not Fresh listings. */
export function isExportCatalogueProduct(
  product: Product | { id?: string; category: string }
): boolean {
  return isExportProduct(product) || String(product.id ?? "").startsWith("drink-");
}

export function excludeExportCatalogue<T extends { id?: string; category: string }>(
  products: T[]
): T[] {
  return products.filter((product) => !isExportCatalogueProduct(product));
}

export function isExportOnlyCart(
  items: Array<{ product: Product }>
): boolean {
  return items.length > 0 && items.every(({ product }) => isExportProduct(product));
}

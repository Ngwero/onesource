import { normalizeCategoryId } from "../data/categories";
import type { Product } from "../types/product";

export const EXPORT_CATEGORY_ID = "export-fresh-produce";

export function isExportProduct(product: Product | { category: string }): boolean {
  return normalizeCategoryId(product.category) === EXPORT_CATEGORY_ID;
}

export function isExportOnlyCart(
  items: Array<{ product: Product }>
): boolean {
  return items.length > 0 && items.every(({ product }) => isExportProduct(product));
}

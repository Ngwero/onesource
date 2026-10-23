import type { Product } from "../types/product";
import { homeImageKey } from "../data/homeRows";

function claimPreview(product: Product, ids: Set<string>, photos: Set<string>) {
  if (product.id) ids.add(product.id);
  const photo = homeImageKey(product.image);
  if (photo) photos.add(photo);
}

/** Keep the feed stable as pages append, without repeating a product or its photo. */
export function uniquePreviewProducts(
  products: Product[],
  exclude: readonly Product[] = [],
): Product[] {
  const ids = new Set<string>();
  const photos = new Set<string>();
  for (const product of exclude) claimPreview(product, ids, photos);
  return products.filter((product) => {
    const photo = homeImageKey(product.image);
    if (ids.has(product.id) || !photo || photos.has(photo)) return false;
    ids.add(product.id);
    photos.add(photo);
    return true;
  });
}

/** Reserve a featured row's cards and images so surrounding shelves stay varied. */
export function excludePreviewProducts(
  products: Product[],
  featured: readonly Product[],
): Product[] {
  return uniquePreviewProducts(products, featured);
}

/** Assign unique cards in display order so earlier rows keep a photo later rows skip. */
export function assignUniquePreviewRows<K extends string>(
  rows: { key: K; products: Product[] }[],
): { claimed: Product[]; byKey: Record<K, Product[]> } {
  const claimed: Product[] = [];
  const byKey = {} as Record<K, Product[]>;
  for (const row of rows) {
    const unique = uniquePreviewProducts(row.products, claimed);
    byKey[row.key] = unique;
    claimed.push(...unique);
  }
  return { claimed, byKey };
}

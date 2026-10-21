import type { Product } from "../types/product";
import { homeImageKey } from "../data/homeRows";

/** Keep the feed stable as pages append, without repeating a product or its photo. */
export function uniquePreviewProducts(products: Product[]): Product[] {
  const ids = new Set<string>();
  const photos = new Set<string>();
  return products.filter((product) => {
    const photo = homeImageKey(product.image);
    if (ids.has(product.id) || (photo && photos.has(photo))) return false;
    ids.add(product.id);
    if (photo) photos.add(photo);
    return true;
  });
}

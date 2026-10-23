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

/** Reserve a featured row's cards and images so surrounding shelves stay varied. */
export function excludePreviewProducts(products: Product[], featured: Product[]): Product[] {
  const ids = new Set(featured.map(p => p.id));
  const photos = new Set(featured.map(p => homeImageKey(p.image)).filter(Boolean));
  return products.filter(p => !ids.has(p.id) && !photos.has(homeImageKey(p.image)));
}

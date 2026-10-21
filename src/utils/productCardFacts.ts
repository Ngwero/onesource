import type { Product } from "../types/product";

/** Only show facts supplied by the catalogue, never inferred sales or badges. */
export function productCardFacts(product: Product) {
  const stock = product.stockQuantity;
  const available = product.inStock && (stock == null || stock > 0);
  const onSale = product.originalPrice != null && product.originalPrice > product.price;
  const lowStock = available && stock != null && stock <= 12 ? stock : null;
  const size = product.details?.specs?.find(spec =>
    ["size", "volume", "weight", "shade", "colour", "color"].includes(spec.key.toLowerCase())
  )?.value.trim() || null;
  return {
    available,
    discount: onSale ? Math.round((1 - product.price / product.originalPrice!) * 100) : 0,
    lowStock,
    brand: product.details?.brand?.trim() || null,
    supplier: product.supplierName?.trim() || null,
    size,
  };
}

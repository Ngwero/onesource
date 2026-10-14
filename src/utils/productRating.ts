import type { Product } from "../types/product";

export type VerifiedRating = { rating: number; count: number };

/** Real customer rating for a product, or null when it has no genuine reviews. */
export function getVerifiedRating(product: Product): VerifiedRating | null {
  if (!product.details?.ratingSource) return null;
  const rating = Number(product.rating);
  const count = Number(product.reviewCount);
  if (!(rating > 0) || !(count > 0)) return null;
  return { rating: Math.min(5, rating), count };
}

import type { Product } from "../../types/product";
import { ProductCard } from "../ProductCard";

type Props = { product: Product; priority?: boolean };

/** Cosmetics listing card: same shared listing card as every shop. */
export function CosmeticsProductCard(props: Props) {
  return <ProductCard {...props} />;
}

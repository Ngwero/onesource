import type { Product } from "../../types/product";
import { ProductCard } from "../ProductCard";

type Props = { product: Product; priority?: boolean };

/** Cosmetics and pharmacy use the same complete listing details as Fresh. */
export function CosmeticsProductCard(props: Props) {
  return <ProductCard {...props} />;
}

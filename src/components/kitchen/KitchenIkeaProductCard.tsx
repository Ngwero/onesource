import type { Product } from "../../types/product";
import { ProductCard } from "../ProductCard";

type Props = { product: Product; priority?: boolean };

export function KitchenIkeaProductCard(props: Props) {
  return <ProductCard {...props} />;
}

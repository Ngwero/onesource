import type { Product } from "../../types/product";
import { ProductCard } from "../ProductCard";

type Props = {
  product: Product;
  actionLabelKey?: string;
  priority?: boolean;
};

export function FreshAisleProductCard(props: Props) {
  return <ProductCard {...props} />;
}

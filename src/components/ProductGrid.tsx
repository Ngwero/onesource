import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
import { ScrollReveal } from "./ScrollReveal";

type Props = {
  products: Product[];
};

export function ProductGrid({ products }: Props) {
  return (
    <ScrollReveal className="product-grid w-full" variant="fade-up">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ScrollReveal>
  );
}

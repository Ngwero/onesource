import { useMemo } from "react";
import { useProducts } from "../context/ProductsContext";
import { groupCosmeticsByAisle, isCosmeticsProduct } from "../utils/cosmeticsMode";

export function useCosmeticsCatalog() {
  const { products, shopLoading } = useProducts();
  const loading = shopLoading.cosmetics;

  const cosmeticsProducts = useMemo(
    () => products.filter(isCosmeticsProduct),
    [products]
  );

  const aisles = useMemo(
    () => groupCosmeticsByAisle(cosmeticsProducts),
    [cosmeticsProducts]
  );

  return { cosmeticsProducts, aisles, loading };
}

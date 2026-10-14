import { useMemo } from "react";
import { useProducts } from "../context/ProductsContext";
import { useEnsureShops } from "./useEnsureShops";
import { groupCosmeticsByAisle, isCosmeticsProduct } from "../utils/cosmeticsMode";

const SHOPS = ["cosmetics"] as const;

export function useCosmeticsCatalog() {
  useEnsureShops(SHOPS);
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

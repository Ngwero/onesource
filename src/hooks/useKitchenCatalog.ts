import { useMemo } from "react";
import { useProducts } from "../context/ProductsContext";
import {
  filterKitchenProducts,
  groupKitchenByAisle,
} from "../utils/kitchenMode";

export function useKitchenCatalog() {
  const { products, shopLoading } = useProducts();
  const loading = shopLoading.kitchen;

  const kitchenProducts = useMemo(
    () => filterKitchenProducts(products),
    [products]
  );

  const aisles = useMemo(
    () => groupKitchenByAisle(kitchenProducts),
    [kitchenProducts]
  );

  return { kitchenProducts, aisles, loading };
}

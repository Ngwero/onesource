import { useMemo } from "react";
import { useProducts } from "../context/ProductsContext";
import {
  filterKitchenProducts,
  groupKitchenByAisle,
} from "../utils/kitchenMode";

export function useKitchenCatalog() {
  const { products, loading } = useProducts();

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

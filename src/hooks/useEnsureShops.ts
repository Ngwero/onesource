import { useEffect } from "react";
import { useProducts, type ProductShop } from "../context/ProductsContext";

/** Loads the given shops' full catalogues (once per session) when the caller mounts. */
export function useEnsureShops(shops: readonly ProductShop[]) {
  const { ensureShop } = useProducts();
  const key = shops.join(",");
  useEffect(() => {
    for (const shop of key.split(",")) {
      if (shop) ensureShop(shop as ProductShop);
    }
  }, [key, ensureShop]);
}

export function shopForProductId(id: string): ProductShop {
  if (id.startsWith("kitchen-")) return "kitchen";
  if (id.startsWith("cosmetics-")) return "cosmetics";
  return "fresh";
}

import { useEffect, useState } from "react";
import type { Product } from "../types/product";
import { fetchProductListPage } from "../api/client";
import { aisleIdFromProductId } from "../data/kitchenWare";
import { cosmeticsAisleIdFromProductId } from "../data/cosmetics";

const NEIGHBOUR_PAGE_SIZE = 60;

/**
 * Newest products from a Kitchen or Cosmetics product's aisle, for its recommendations.
 * Those shops are too large to download whole; Fresh products return an empty list.
 */
export function useAisleNeighbours(productId: string | undefined): Product[] {
  const [result, setResult] = useState<{ id: string; products: Product[] } | null>(null);

  useEffect(() => {
    if (!productId) return;
    const shop = productId.startsWith("kitchen-")
      ? "kitchen"
      : productId.startsWith("cosmetics-")
        ? "cosmetics"
        : null;
    if (!shop) return;
    const aisle =
      shop === "kitchen"
        ? aisleIdFromProductId(productId)
        : cosmeticsAisleIdFromProductId(productId);

    const controller = new AbortController();
    fetchProductListPage(
      { shop, ...(aisle ? { aisle } : {}) },
      0,
      NEIGHBOUR_PAGE_SIZE,
      controller.signal
    )
      .then((page) => setResult({ id: productId, products: page.products }))
      .catch(() => {});
    return () => controller.abort();
  }, [productId]);

  return result && result.id === productId ? result.products : [];
}

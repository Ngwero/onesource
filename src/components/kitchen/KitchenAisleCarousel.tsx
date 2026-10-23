import { useMemo } from "react";
import type { Product } from "../../types/product";
import { uniquePreviewProducts } from "../../utils/uniquePreviewProducts";
import { ShopHomeProductRow } from "../ShopHomeProductRow";

type Props = {
  title: string;
  seeMoreHref: string;
  seeMoreLabel?: string;
  products: Product[];
  /** Hide the Best sellers / Offers switch (kept for callers; Fresh rows have no tabs). */
  hideTabs?: boolean;
  /** Keep a deliberately mixed shelf in its supplied order. */
  preserveOrder?: boolean;
};

const ROW_LIMIT = 24;

function sortBestSellers(products: Product[]) {
  return [...products].sort(
    (a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount
  );
}

export function KitchenAisleCarousel({
  title,
  seeMoreHref,
  products,
  preserveOrder = false,
}: Props) {
  const feedProducts = useMemo(() => {
    const pool = preserveOrder ? products : sortBestSellers(products);
    return uniquePreviewProducts(pool).slice(0, ROW_LIMIT);
  }, [products, preserveOrder]);

  return (
    <ShopHomeProductRow
      title={title}
      products={feedProducts}
      seeAllTo={seeMoreHref}
    />
  );
}

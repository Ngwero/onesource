import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import type { HomeRowConfig } from "../data/homeRows";
import { ShopHomeProductRow } from "./ShopHomeProductRow";

type Props = {
  row: HomeRowConfig;
  products: Product[];
};

function seeAllPath(row: HomeRowConfig): string | undefined {
  if (row.seeAllSearch) {
    return `/search?q=${encodeURIComponent(row.seeAllSearch)}`;
  }
  if (row.seeAllCategoryId) {
    return `/category/${encodeURIComponent(row.seeAllCategoryId)}`;
  }
  return undefined;
}

export function HomeProductRow({ row, products }: Props) {
  const { t } = useTranslation();
  return (
    <ShopHomeProductRow
      title={t(row.titleKey, { defaultValue: row.title })}
      products={products}
      seeAllTo={seeAllPath(row)}
    />
  );
}

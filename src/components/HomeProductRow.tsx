import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import type { HomeRowConfig } from "../data/homeRows";
import { ShopHomeProductRow } from "./ShopHomeProductRow";

type Props = {
  row: HomeRowConfig;
  products: Product[];
};

export function HomeProductRow({ row, products }: Props) {
  const { t } = useTranslation();
  return (
    <ShopHomeProductRow
      title={t(row.titleKey, { defaultValue: row.title })}
      products={products}
      seeAllTo={`/category/${encodeURIComponent(row.seeAllCategoryId)}`}
    />
  );
}

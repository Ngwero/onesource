import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { KitchenIkeaProductCard } from "./KitchenIkeaProductCard";

type SortKey = "top" | "price-asc" | "price-desc" | "name";

type Props = {
  aisleId: string;
  title: string;
  products: Product[];
  initialLimit?: number;
};

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "name":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case "top":
    default:
      return list.sort(
        (a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount
      );
  }
}

export function KitchenIkeaAisle({
  aisleId,
  title,
  products,
  initialLimit = 24,
}: Props) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortKey>("top");
  const [offersOnly, setOffersOnly] = useState(false);
  const [visible, setVisible] = useState(initialLimit);

  const filtered = useMemo(() => {
    const base = offersOnly
      ? products.filter(
          (p) => p.originalPrice != null && p.originalPrice > p.price
        )
      : products;
    return sortProducts(base, sort);
  }, [products, offersOnly, sort]);

  const shown = filtered.slice(0, visible);
  const remaining = Math.max(0, filtered.length - shown.length);

  return (
    <section className="kitchen-ikea-aisle" aria-labelledby={`ikea-${aisleId}`}>
      <div className="kitchen-ikea-aisle-head">
        <div className="kitchen-ikea-aisle-tabs">
          <h2 id={`ikea-${aisleId}`} className="kitchen-ikea-aisle-title">
            {title}
          </h2>
          <span className="kitchen-ikea-aisle-tab" aria-current="page">
            {t("kitchen.itemsTab")}
          </span>
        </div>
      </div>

      <div className="kitchen-ikea-toolbar">
        <label className="kitchen-ikea-sort">
          <span>{t("kitchen.sortBy")}</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setVisible(initialLimit);
            }}
          >
            <option value="top">{t("kitchen.sortTop")}</option>
            <option value="price-asc">{t("kitchen.sortPriceAsc")}</option>
            <option value="price-desc">{t("kitchen.sortPriceDesc")}</option>
            <option value="name">{t("kitchen.sortName")}</option>
          </select>
        </label>

        <label className="kitchen-ikea-check">
          <input
            type="checkbox"
            checked={offersOnly}
            onChange={(e) => {
              setOffersOnly(e.target.checked);
              setVisible(initialLimit);
            }}
          />
          <span>{t("kitchen.offersOnly")}</span>
        </label>

        {(offersOnly || sort !== "top") && (
          <button
            type="button"
            className="kitchen-ikea-reset"
            onClick={() => {
              setOffersOnly(false);
              setSort("top");
              setVisible(initialLimit);
            }}
          >
            {t("kitchen.resetFilters")}
          </button>
        )}

        <span className="kitchen-ikea-toolbar-count">
          {t("kitchen.categoryCount", { count: filtered.length })}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="kitchen-ikea-empty">{t("kitchen.noFilterResults")}</p>
      ) : (
        <div className="kitchen-ikea-grid">
          {shown.map((product, index) => (
            <KitchenIkeaProductCard
              key={product.id}
              product={product}
              priority={index < 4}
            />
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="kitchen-ikea-more-wrap">
          <button
            type="button"
            className="kitchen-ikea-more"
            onClick={() => setVisible((n) => n + initialLimit)}
          >
            {t("kitchen.showMore", { count: Math.min(remaining, initialLimit) })}
          </button>
        </div>
      )}
    </section>
  );
}

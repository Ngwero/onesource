import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { KitchenIkeaProductCard } from "./KitchenIkeaProductCard";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../InfiniteScrollFooter";
import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";

type SortKey = "top" | "price-asc" | "price-desc" | "name";

type Props = {
  aisleId: string;
  title: string;
  /** Shown when the aisle has no products at all (no filters applied). */
  emptyState?: ReactNode;
};

export function KitchenIkeaAisle({ aisleId, title, emptyState }: Props) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortKey>("top");
  const [offersOnly, setOffersOnly] = useState(false);
  const list = useInfiniteProducts({ shop: "kitchen", aisle: aisleId, sale: offersOnly, sort });
  const { products } = list;
  const filtersActive = offersOnly || sort !== "top";
  const isEmpty = !list.initialLoading && products.length === 0 && !list.hasMore && !list.error;

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
            onChange={(e) => setSort(e.target.value as SortKey)}
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
            onChange={(e) => setOffersOnly(e.target.checked)}
          />
          <span>{t("kitchen.offersOnly")}</span>
        </label>

        {filtersActive && (
          <button
            type="button"
            className="kitchen-ikea-reset"
            onClick={() => {
              setOffersOnly(false);
              setSort("top");
            }}
          >
            {t("kitchen.resetFilters")}
          </button>
        )}

      </div>

      {list.initialLoading ? (
        <ProductGridSkeleton gridClassName="kitchen-ikea-grid" />
      ) : isEmpty ? (
        filtersActive || !emptyState ? (
          <p className="kitchen-ikea-empty">{t("kitchen.noFilterResults")}</p>
        ) : (
          emptyState
        )
      ) : (
        <>
          <div className="kitchen-ikea-grid">
            {products.map((product, index) => (
              <KitchenIkeaProductCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))}
          </div>
          <InfiniteScrollFooter
            sentinelRef={list.sentinelRef}
            hasMore={list.hasMore}
            loading={list.loading}
            error={list.error}
            onRetry={list.retry}
            count={products.length}
          />
        </>
      )}
    </section>
  );
}

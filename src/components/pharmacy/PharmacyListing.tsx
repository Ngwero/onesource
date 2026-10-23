import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../InfiniteScrollFooter";
import { ProductCard } from "../ProductCard";

type SortKey = "top" | "price-asc" | "price-desc" | "name";

type Props = {
  baseQuery: { aisle?: string; q?: string; sale?: boolean };
  emptyState?: ReactNode;
};

/** Scrollable pharmacy grid. Uses the shared listing card. */
export function PharmacyListing({ baseQuery, emptyState }: Props) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortKey>("top");
  const [offersOnly, setOffersOnly] = useState(false);
  const list = useInfiniteProducts({
    shop: "pharmacy",
    ...baseQuery,
    sale: Boolean(baseQuery.sale) || offersOnly,
    sort,
  });
  const { products } = list;
  const isEmpty = !list.initialLoading && products.length === 0 && !list.hasMore && !list.error;

  return (
    <section className="cos-listing pharm-photos">
      <div className="cos-toolbar">
        <label className="cos-select">
          <span>{t("kitchen.sortBy")}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="top">{t("kitchen.sortTop")}</option>
            <option value="price-asc">{t("kitchen.sortPriceAsc")}</option>
            <option value="price-desc">{t("kitchen.sortPriceDesc")}</option>
            <option value="name">{t("kitchen.sortName")}</option>
          </select>
        </label>
        <button
          type="button"
          className={`cos-pill${offersOnly ? " is-active" : ""}`}
          aria-pressed={offersOnly}
          onClick={() => setOffersOnly((v) => !v)}
        >
          {t("kitchen.offersOnly")}
        </button>
      </div>

      {list.initialLoading ? (
        <ProductGridSkeleton gridClassName="cos-grid" cards={10} />
      ) : isEmpty ? (
        emptyState ?? <p className="cos-empty">{t("pharmacy.empty")}</p>
      ) : (
        <>
          <div className="cos-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
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

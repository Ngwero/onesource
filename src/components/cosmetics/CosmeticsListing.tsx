import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchProductTitles, type ProductListQuery } from "../../api/client";
import { cosmeticBrandTitlePrefixes, splitCosmeticTitle } from "../../data/cosmeticBrands";
import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../InfiniteScrollFooter";
import { CosmeticsProductCard } from "./CosmeticsProductCard";

type SortKey = "top" | "price-asc" | "price-desc" | "name";

type BaseQuery = Pick<ProductListQuery, "aisle" | "q" | "sale">;

type Props = {
  /** Scope of the listing (aisle, search text, sale-only page). */
  baseQuery: BaseQuery;
  /** Shown when the scope has no products at all (no filters applied). */
  emptyState?: ReactNode;
};

type BrandCounts = Array<[string, number]>;

const brandCache = new Map<string, Promise<BrandCounts>>();

function loadBrandCounts(query: ProductListQuery): Promise<BrandCounts> {
  const key = JSON.stringify(query);
  let pending = brandCache.get(key);
  if (!pending) {
    pending = fetchProductTitles(query)
      .then((titles) => {
        const counts = new Map<string, number>();
        for (const title of titles) {
          const brand = splitCosmeticTitle(title).brand;
          if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      })
      .catch(() => {
        brandCache.delete(key);
        return [];
      });
    brandCache.set(key, pending);
  }
  return pending;
}

/** Brand options (with counts) for everything in scope, not just the loaded pages. */
function useBrandCounts(query: ProductListQuery): BrandCounts {
  const key = JSON.stringify(query);
  const [state, setState] = useState<{ key: string; brands: BrandCounts } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBrandCounts(JSON.parse(key) as ProductListQuery).then((brands) => {
      if (!cancelled) setState({ key, brands });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state?.key === key ? state.brands : [];
}

/** Filterable, sortable beauty grid that keeps loading as you scroll. Brand is kept in ?brand=. */
export function CosmeticsListing({ baseQuery, emptyState }: Props) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const brand = params.get("brand") ?? "";
  const [sort, setSort] = useState<SortKey>("top");
  const [offersOnly, setOffersOnly] = useState(false);

  const scope: ProductListQuery = { shop: "cosmetics", ...baseQuery };
  const brands = useBrandCounts(scope);
  const brandPrefixes = brand ? cosmeticBrandTitlePrefixes(brand) : [];
  const list = useInfiniteProducts({
    ...scope,
    sale: Boolean(baseQuery.sale) || offersOnly,
    sort,
    titlePrefix: brandPrefixes.length ? brandPrefixes : brand ? [brand] : undefined,
  });
  const { products } = list;

  const setBrand = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set("brand", next);
    else nextParams.delete("brand");
    setParams(nextParams, { replace: true });
  };

  const hasFilters = Boolean(brand) || offersOnly || sort !== "top";
  const isEmpty = !list.initialLoading && products.length === 0 && !list.hasMore && !list.error;
  const brandOptions =
    brand && !brands.some(([name]) => name === brand) ? [[brand, 0] as [string, number], ...brands] : brands;

  return (
    <section className="cos-listing">
      <div className="cos-toolbar">
        <label className="cos-select">
          <span>{t("cosmetics.brandLabel")}</span>
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">{t("cosmetics.allBrands")}</option>
            {brandOptions.map(([name, count]) => (
              <option key={name} value={name}>
                {count > 0 ? `${name} (${count})` : name}
              </option>
            ))}
          </select>
        </label>

        <label className="cos-select">
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

        <button
          type="button"
          className={`cos-pill${offersOnly ? " is-active" : ""}`}
          aria-pressed={offersOnly}
          onClick={() => setOffersOnly((v) => !v)}
        >
          {t("kitchen.offersOnly")}
        </button>

        {hasFilters && (
          <button
            type="button"
            className="cos-reset"
            onClick={() => {
              setBrand("");
              setSort("top");
              setOffersOnly(false);
            }}
          >
            {t("kitchen.resetFilters")}
          </button>
        )}

      </div>

      {list.initialLoading ? (
        <ProductGridSkeleton gridClassName="cos-grid" cards={10} />
      ) : isEmpty ? (
        hasFilters || !emptyState ? (
          <p className="cos-empty">{t("kitchen.noFilterResults")}</p>
        ) : (
          emptyState
        )
      ) : (
        <>
          <div className="cos-grid">
            {products.map((product, index) => (
              <CosmeticsProductCard key={product.id} product={product} priority={index < 10} />
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

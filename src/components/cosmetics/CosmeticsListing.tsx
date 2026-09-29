import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import { splitCosmeticTitle } from "../../data/cosmeticBrands";
import { CosmeticsProductCard } from "./CosmeticsProductCard";

type SortKey = "top" | "price-asc" | "price-desc" | "name";

type Props = {
  products: Product[];
  pageSize?: number;
};

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "name":
      return list.sort((a, b) =>
        splitCosmeticTitle(a.title).name.localeCompare(splitCosmeticTitle(b.title).name)
      );
    case "top":
    default:
      return list.sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount);
  }
}

/** Filterable, sortable beauty grid. Brand filter is kept in the ?brand= query. */
export function CosmeticsListing({ products, pageSize = 40 }: Props) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const brand = params.get("brand") ?? "";
  const [sort, setSort] = useState<SortKey>("top");
  const [offersOnly, setOffersOnly] = useState(false);
  const [visible, setVisible] = useState(pageSize);

  const brandOf = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of products) map.set(p.id, splitCosmeticTitle(p.title).brand);
    return map;
  }, [products]);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of brandOf.values()) if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [brandOf]);

  const filtered = useMemo(() => {
    let list = products;
    if (brand) list = list.filter((p) => brandOf.get(p.id) === brand);
    if (offersOnly) list = list.filter((p) => p.originalPrice != null && p.originalPrice > p.price);
    return sortProducts(list, sort);
  }, [products, brand, brandOf, offersOnly, sort]);

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  const setBrand = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set("brand", next);
    else nextParams.delete("brand");
    setParams(nextParams, { replace: true });
    setVisible(pageSize);
  };

  const hasFilters = Boolean(brand) || offersOnly || sort !== "top";

  return (
    <section className="cos-listing">
      <div className="cos-toolbar">
        <label className="cos-select">
          <span>{t("cosmetics.brandLabel")}</span>
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">{t("cosmetics.allBrands")}</option>
            {brands.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        </label>

        <label className="cos-select">
          <span>{t("kitchen.sortBy")}</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setVisible(pageSize);
            }}
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
          onClick={() => {
            setOffersOnly((v) => !v);
            setVisible(pageSize);
          }}
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

        <span className="cos-count">{t("kitchen.categoryCount", { count: filtered.length })}</span>
      </div>

      {shown.length === 0 ? (
        <p className="cos-empty">{t("kitchen.noFilterResults")}</p>
      ) : (
        <div className="cos-grid">
          {shown.map((product, index) => (
            <CosmeticsProductCard key={product.id} product={product} priority={index < 10} />
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="cos-more-wrap">
          <button
            type="button"
            className="cos-more"
            onClick={() => setVisible((n) => n + pageSize)}
          >
            {t("kitchen.showMore", { count: Math.min(remaining, pageSize) })}
          </button>
        </div>
      )}
    </section>
  );
}

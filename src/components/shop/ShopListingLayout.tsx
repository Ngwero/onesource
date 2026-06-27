import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types/product";
import {
  applyShopFilters,
  suggestRelatedTerms,
  facetCount,
  countByCategory,
  type ShopFilters,
  DEFAULT_SHOP_FILTERS,
  type PriceRangeId,
} from "../../utils/shopFilters";
import { ShopFilterSidebar } from "./ShopFilterSidebar";

type Props = {
  products: Product[];
  header: ReactNode;
  initialFilters?: Partial<ShopFilters>;
  lockCategoryId?: string;
  searchQuery?: string;
  showCategoryFilter?: boolean;
  emptyState?: ReactNode;
  children: (filtered: Product[]) => ReactNode;
};

function buildFacetCounts(products: Product[]) {
  const categories = countByCategory(products);
  const prices = {
    "under-15k": facetCount(products, (p) => p.price < 15000),
    "15k-50k": facetCount(products, (p) => p.price >= 15000 && p.price < 50000),
    "50k-100k": facetCount(products, (p) => p.price >= 50000 && p.price < 100000),
    "over-100k": facetCount(products, (p) => p.price >= 100000),
  } satisfies Record<PriceRangeId, number>;

  return {
    prime: facetCount(products, (p) => p.prime),
    onSale: facetCount(products, (p) => !!p.originalPrice),
    inStock: facetCount(products, (p) => p.inStock),
    rating4: facetCount(products, (p) => p.rating >= 4),
    rating3: facetCount(products, (p) => p.rating >= 3),
    rating2: facetCount(products, (p) => p.rating >= 2),
    categories,
    prices,
  };
}

export function ShopListingLayout({
  products,
  header,
  initialFilters,
  lockCategoryId,
  searchQuery = "",
  showCategoryFilter = true,
  emptyState,
  children,
}: Props) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ShopFilters>(() => ({
    ...DEFAULT_SHOP_FILTERS,
    ...initialFilters,
    categoryIds: initialFilters?.categoryIds ?? (lockCategoryId ? [lockCategoryId] : []),
  }));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (lockCategoryId) {
      setFilters((f) => ({
        ...f,
        categoryIds: [lockCategoryId],
      }));
    }
  }, [lockCategoryId]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const relatedTerms = useMemo(
    () => (searchQuery ? suggestRelatedTerms(products, searchQuery) : []),
    [products, searchQuery]
  );

  const filtered = useMemo(() => applyShopFilters(products, filters), [products, filters]);
  const facetCounts = useMemo(() => buildFacetCounts(products), [products]);

  const sidebar = (
    <ShopFilterSidebar
      filters={filters}
      onChange={setFilters}
      facetCounts={facetCounts}
      relatedTerms={relatedTerms}
      showCategories={showCategoryFilter && !lockCategoryId}
    />
  );

  return (
    <div className="shop-listing w-full">
      {header != null && <div className="mb-4 sm:mb-6">{header}</div>}

      <div className="shop-listing-toolbar lg:hidden">
        <button
          type="button"
          className="shop-filter-mobile-btn"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          {t("shopFilters.title")}
        </button>
      </div>

      <div className="shop-listing-grid">
        <div className="shop-listing-sidebar hidden lg:block">{sidebar}</div>

        <div className="shop-listing-main min-w-0">
          {filtered.length === 0 ? (
            emptyState ?? (
              <div className="card p-8 text-center">
                <p className="text-text-muted text-sm">{t("shopFilters.noMatches")}</p>
              </div>
            )
          ) : (
            children(filtered)
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="shop-filter-drawer" role="dialog" aria-modal="true" aria-label={t("shopFilters.title")}>
          <button
            type="button"
            className="shop-filter-drawer-backdrop"
            aria-label={t("shopFilters.close")}
            onClick={() => setMobileOpen(false)}
          />
          <div className="shop-filter-drawer-panel">
            <div className="shop-filter-drawer-header">
              <h2 className="font-bold text-lg">{t("shopFilters.title")}</h2>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-muted"
                onClick={() => setMobileOpen(false)}
                aria-label={t("shopFilters.close")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="shop-filter-drawer-body">{sidebar}</div>
            <div className="shop-filter-drawer-footer">
              <button type="button" className="btn-primary w-full" onClick={() => setMobileOpen(false)}>
                {t("shopFilters.showResults")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

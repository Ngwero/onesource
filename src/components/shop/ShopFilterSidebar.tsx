import { useTranslation } from "react-i18next";
import { useProducts } from "../../context/ProductsContext";
import { useCurrency } from "../../context/CurrencyContext";
import {
  type ShopFilters,
  type PriceRangeId,
  DEFAULT_SHOP_FILTERS,
  hasActiveFilters,
} from "../../utils/shopFilters";

type FacetCounts = {
  prime: number;
  onSale: number;
  inStock: number;
  rating4: number;
  rating3: number;
  rating2: number;
  categories: Record<string, number>;
  prices: Record<PriceRangeId, number>;
};

type Props = {
  filters: ShopFilters;
  onChange: (next: ShopFilters) => void;
  facetCounts: FacetCounts;
  relatedTerms?: string[];
  showCategories?: boolean;
  className?: string;
};

const PRICE_RANGE_IDS: PriceRangeId[] = [
  "under-15k",
  "15k-50k",
  "50k-100k",
  "over-100k",
];

const RATING_OPTIONS = [4, 3, 2] as const;

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="shop-filter-section">
      <h3 className="shop-filter-heading">{title}</h3>
      <div className="shop-filter-body">{children}</div>
    </section>
  );
}

function CheckboxRow({
  id,
  label,
  count,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="shop-filter-row">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="shop-filter-checkbox"
      />
      <span className="shop-filter-label">
        {label}
        {count != null && count > 0 && (
          <span className="shop-filter-count"> ({count})</span>
        )}
      </span>
    </label>
  );
}

export function ShopFilterSidebar({
  filters,
  onChange,
  facetCounts,
  relatedTerms = [],
  showCategories = true,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const { categories } = useProducts();
  const { formatPrice } = useCurrency();

  const toggleCategory = (id: string) => {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id];
    onChange({ ...filters, categoryIds: next });
  };

  const togglePrice = (id: PriceRangeId) => {
    const next = filters.priceRanges.includes(id)
      ? filters.priceRanges.filter((r) => r !== id)
      : [...filters.priceRanges, id];
    onChange({ ...filters, priceRanges: next });
  };

  const toggleTerm = (term: string) => {
    const key = term.toLowerCase();
    const next = filters.relatedTerms.some((x) => x.toLowerCase() === key)
      ? filters.relatedTerms.filter((x) => x.toLowerCase() !== key)
      : [...filters.relatedTerms, term];
    onChange({ ...filters, relatedTerms: next });
  };

  const priceLabels: Record<PriceRangeId, string> = {
    "under-15k": t("shopFilters.priceUnder", { price: formatPrice(15000) }),
    "15k-50k": t("shopFilters.priceBetween", {
      min: formatPrice(15000),
      max: formatPrice(50000),
    }),
    "50k-100k": t("shopFilters.priceBetween", {
      min: formatPrice(50000),
      max: formatPrice(100000),
    }),
    "over-100k": t("shopFilters.priceOver", { price: formatPrice(100000) }),
  };

  return (
    <aside className={`shop-filter-sidebar ${className}`.trim()} aria-label={t("shopFilters.title")}>
      {hasActiveFilters(filters) && (
        <button
          type="button"
          className="shop-filter-clear"
          onClick={() => onChange({ ...DEFAULT_SHOP_FILTERS })}
        >
          {t("shopFilters.clearAll")}
        </button>
      )}

      {relatedTerms.length > 0 && (
        <FilterSection title={t("shopFilters.relatedIdeas")}>
          <ul className="shop-filter-links">
            {relatedTerms.map((term) => {
              const active = filters.relatedTerms.some(
                (x) => x.toLowerCase() === term.toLowerCase()
              );
              return (
                <li key={term}>
                  <button
                    type="button"
                    className={active ? "shop-filter-link-active" : "shop-filter-link"}
                    onClick={() => toggleTerm(term)}
                  >
                    {term}
                  </button>
                </li>
              );
            })}
          </ul>
        </FilterSection>
      )}

      <FilterSection title={t("shopFilters.delivery")}>
        <CheckboxRow
          id="filter-prime"
          label={t("shopFilters.primeDelivery")}
          count={facetCounts.prime}
          checked={filters.primeOnly}
          onChange={(primeOnly) => onChange({ ...filters, primeOnly })}
        />
        <CheckboxRow
          id="filter-instock"
          label={t("shopFilters.inStock")}
          count={facetCounts.inStock}
          checked={filters.inStockOnly}
          onChange={(inStockOnly) => onChange({ ...filters, inStockOnly })}
        />
      </FilterSection>

      {showCategories && categories.length > 0 && (
        <FilterSection title={t("shopFilters.department")}>
          <ul className="shop-filter-list max-h-52 overflow-y-auto scrollbar-hide">
            {categories.map((c) => {
              const count = facetCounts.categories[c.id] ?? 0;
              if (count === 0) return null;
              return (
                <li key={c.id}>
                  <CheckboxRow
                    id={`filter-cat-${c.id}`}
                    label={`${c.icon} ${t(`categories.names.${c.id}`, { defaultValue: c.name })}`}
                    checked={filters.categoryIds.includes(c.id)}
                    onChange={() => {
                      toggleCategory(c.id);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </FilterSection>
      )}

      <FilterSection title={t("shopFilters.customerReview")}>
        <ul className="shop-filter-stars">
          {RATING_OPTIONS.map((stars) => {
            const count =
              stars === 4
                ? facetCounts.rating4
                : stars === 3
                  ? facetCounts.rating3
                  : facetCounts.rating2;
            const active = filters.minRating === stars;
            return (
              <li key={stars}>
                <button
                  type="button"
                  className={`shop-filter-star-btn${active ? " shop-filter-star-btn--active" : ""}`}
                  onClick={() =>
                    onChange({
                      ...filters,
                      minRating: active ? null : stars,
                    })
                  }
                >
                  <span className="shop-filter-stars-icons" aria-hidden>
                    {"★".repeat(stars)}
                    <span className="text-border">{"★".repeat(5 - stars)}</span>
                  </span>
                  <span className="shop-filter-star-label">
                    {t("shopFilters.starsAndUp")}
                    {count > 0 && <span className="shop-filter-count"> ({count})</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      <FilterSection title={t("shopFilters.price")}>
        <ul className="shop-filter-list">
          {PRICE_RANGE_IDS.map((id) => {
            const count = facetCounts.prices[id] ?? 0;
            if (count === 0) return null;
            return (
              <li key={id}>
                <CheckboxRow
                  id={`filter-price-${id}`}
                  label={priceLabels[id]}
                  count={count}
                  checked={filters.priceRanges.includes(id)}
                  onChange={() => togglePrice(id)}
                />
              </li>
            );
          })}
        </ul>
      </FilterSection>

      <FilterSection title={t("shopFilters.deals")}>
        <CheckboxRow
          id="filter-sale"
          label={t("shopFilters.onSale")}
          count={facetCounts.onSale}
          checked={filters.onSaleOnly}
          onChange={(onSaleOnly) => onChange({ ...filters, onSaleOnly })}
        />
      </FilterSection>
    </aside>
  );
}

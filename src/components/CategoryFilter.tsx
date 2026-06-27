import { useTranslation } from "react-i18next";
import { useProducts } from "../context/ProductsContext";
import { AGRI_CATEGORIES, CATEGORY_GROUPS } from "../data/categories";

type Props = {
  value: string;
  onChange: (categoryId: string) => void;
  showAll?: boolean;
  className?: string;
};

export function CategoryFilter({
  value,
  onChange,
  showAll = true,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const { categories } = useProducts();

  const list = categories.length ? categories : AGRI_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile: native select */}
      <div className="md:hidden">
        <label className="sr-only" htmlFor="category-filter-select">
          {t("categories.filterLabel")}
        </label>
        <select
          id="category-filter-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm font-medium focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
        >
          {showAll && (
            <option value="">
              {t("categories.allProducts")}
            </option>
          )}
          {CATEGORY_GROUPS.map((group) => {
            const inGroup = list.filter(
              (c) => AGRI_CATEGORIES.find((a) => a.id === c.id)?.group === group.id
            );
            if (!inGroup.length) return null;
            return (
              <optgroup key={group.id} label={t(group.labelKey)}>
                {inGroup.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {t(`categories.names.${c.id}`, { defaultValue: c.name })}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      {/* Desktop: chip grid */}
      <div className="hidden md:block">
        <div className="flex flex-wrap gap-2">
          {showAll && (
            <button
              type="button"
              onClick={() => onChange("")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                value === ""
                  ? "bg-accent text-white shadow-sm"
                  : "bg-surface border border-border text-text-muted hover:border-accent/40 hover:text-accent"
              }`}
            >
              {t("categories.all")}
            </button>
          )}
          {list.map((c) => {
            const active = value === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c.id)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  active
                    ? "bg-accent text-white shadow-sm"
                    : "bg-surface border border-border text-text-muted hover:border-accent/40 hover:text-accent"
                }`}
              >
                <span className="mr-1">{c.icon}</span>
                {t(`categories.names.${c.id}`, { defaultValue: c.name })}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

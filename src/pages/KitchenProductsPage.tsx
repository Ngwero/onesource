import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { KitchenIkeaProductCard } from "../components/kitchen/KitchenIkeaProductCard";
import { useKitchenCatalog } from "../hooks/useKitchenCatalog";
import type { Product } from "../types/product";

const PAGE_SIZE = 36;

type SortKey = "top" | "price-asc" | "price-desc" | "name";

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

export function KitchenProductsPage() {
  const { t } = useTranslation();
  const { kitchenProducts, loading } = useKitchenCatalog();
  const [params] = useSearchParams();
  const saleOnly = params.get("sale") === "1";
  const [sort, setSort] = useState<SortKey>("top");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const base = saleOnly
      ? kitchenProducts.filter(
          (p) => p.originalPrice != null && p.originalPrice > p.price
        )
      : kitchenProducts;
    return sortProducts(base, sort);
  }, [kitchenProducts, saleOnly, sort]);

  const shown = filtered.slice(0, visible);
  const remaining = Math.max(0, filtered.length - shown.length);

  return (
    <div className="kitchen-home kitchen-subpage w-full pb-20">
      <PageContainer className="kitchen-home-shell" bleed>
        <nav className="kitchen-sub-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/kitchen">{t("kitchen.brand")}</Link>
          <span aria-hidden>/</span>
          <span>
            {saleOnly ? t("kitchen.home.feedOffers") : t("kitchen.navAll")}
          </span>
        </nav>

        <header className="kitchen-sub-hero">
          <h1>
            {saleOnly
              ? t("kitchen.home.feedOffers")
              : t("kitchen.home.catalogsTitle")}
          </h1>
          <p>
            {t("kitchen.catalogSub", { count: filtered.length })}
          </p>
        </header>

        <div className="kitchen-ikea-toolbar">
          <label className="kitchen-ikea-sort">
            <span>{t("kitchen.sortBy")}</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setVisible(PAGE_SIZE);
              }}
            >
              <option value="top">{t("kitchen.sortTop")}</option>
              <option value="price-asc">{t("kitchen.sortPriceAsc")}</option>
              <option value="price-desc">{t("kitchen.sortPriceDesc")}</option>
              <option value="name">{t("kitchen.sortName")}</option>
            </select>
          </label>
          <Link
            to={saleOnly ? "/kitchen/products" : "/kitchen/products?sale=1"}
            className="kitchen-ikea-reset"
          >
            {saleOnly
              ? t("kitchen.navAll")
              : t("kitchen.home.feedOffers")}
          </Link>
          <span className="kitchen-ikea-toolbar-count">
            {t("kitchen.categoryCount", { count: filtered.length })}
          </span>
        </div>

        {loading && kitchenProducts.length === 0 ? (
          <p className="kitchen-home-empty">{t("common.loading")}</p>
        ) : shown.length === 0 ? (
          <div className="kitchen-home-empty">
            <p>{t("kitchen.noFilterResults")}</p>
            <Link to="/kitchen/products" className="kitchen-home-reset">
              {t("kitchen.resetFilters")}
            </Link>
          </div>
        ) : (
          <>
            <div className="kitchen-home-grid">
              {shown.map((product, index) => (
                <KitchenIkeaProductCard
                  key={product.id}
                  product={product}
                  priority={index < 8}
                />
              ))}
            </div>
            {remaining > 0 && (
              <div className="kitchen-home-more-wrap">
                <button
                  type="button"
                  className="kitchen-home-more"
                  onClick={() => setVisible((n) => n + PAGE_SIZE)}
                >
                  {t("kitchen.showMore", {
                    count: Math.min(remaining, PAGE_SIZE),
                  })}
                </button>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </div>
  );
}

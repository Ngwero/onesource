import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { KitchenIkeaProductCard } from "../components/kitchen/KitchenIkeaProductCard";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../components/InfiniteScrollFooter";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";

type SortKey = "top" | "price-asc" | "price-desc" | "name";

export function KitchenProductsPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const saleOnly = params.get("sale") === "1";
  const [sort, setSort] = useState<SortKey>("top");
  const list = useInfiniteProducts({ shop: "kitchen", sale: saleOnly, sort });
  const { products } = list;

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
            {t("kitchen.catalogSub")}
          </p>
        </header>

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
          <Link
            to={saleOnly ? "/kitchen/products" : "/kitchen/products?sale=1"}
            className="kitchen-ikea-reset"
          >
            {saleOnly
              ? t("kitchen.navAll")
              : t("kitchen.home.feedOffers")}
          </Link>
        </div>

        {list.initialLoading ? (
          <ProductGridSkeleton gridClassName="kitchen-home-grid" />
        ) : products.length === 0 && !list.hasMore && !list.error ? (
          <div className="kitchen-home-empty">
            <p>{t("kitchen.noFilterResults")}</p>
            <Link to="/kitchen/products" className="kitchen-home-reset">
              {t("kitchen.resetFilters")}
            </Link>
          </div>
        ) : (
          <>
            <div className="kitchen-home-grid">
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
      </PageContainer>
    </div>
  );
}

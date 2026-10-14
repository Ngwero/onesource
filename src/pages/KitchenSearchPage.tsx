import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { KitchenIkeaProductCard } from "../components/kitchen/KitchenIkeaProductCard";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../components/InfiniteScrollFooter";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";

export function KitchenSearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const list = useInfiniteProducts(query ? { shop: "kitchen", q: query } : null);
  const results = list.products;
  const noResults = !list.initialLoading && results.length === 0 && !list.hasMore && !list.error;

  return (
    <div className="kitchen-home kitchen-subpage w-full pb-20">
      <PageContainer className="kitchen-home-shell" bleed>
        <nav className="kitchen-sub-crumb" aria-label={t("common.breadcrumb")}>
          <Link to="/kitchen">{t("kitchen.brand")}</Link>
          <span aria-hidden>/</span>
          <span>{t("common.search")}</span>
        </nav>

        <header className="kitchen-sub-hero">
          <h1>
            {query
              ? noResults
                ? t("search.noResults", { query })
                : t("search.forQuery", { query })
              : t("kitchen.searchTitle")}
          </h1>
          {!query && (
            <p>{t("kitchen.searchHint")}</p>
          )}
        </header>

        {!query ? (
          <div className="kitchen-home-empty">
            <p>{t("search.tryDifferent")}</p>
            <Link to="/kitchen/categories" className="kitchen-home-reset">
              {t("kitchen.navCategories")}
            </Link>
          </div>
        ) : list.initialLoading ? (
          <ProductGridSkeleton gridClassName="kitchen-home-grid" />
        ) : noResults ? (
          <div className="kitchen-home-empty">
            <p>{t("search.tryDifferent")}</p>
            <Link to="/kitchen/categories" className="kitchen-home-reset">
              {t("kitchen.navCategories")}
            </Link>
          </div>
        ) : (
          <>
            <div className="kitchen-home-grid">
              {results.map((product, index) => (
                <KitchenIkeaProductCard
                  key={product.id}
                  product={product}
                  priority={index < 8}
                />
              ))}
            </div>
            <InfiniteScrollFooter
              sentinelRef={list.sentinelRef}
              hasMore={list.hasMore}
              loading={list.loading}
              error={list.error}
              onRetry={list.retry}
              count={results.length}
            />
          </>
        )}
      </PageContainer>
    </div>
  );
}

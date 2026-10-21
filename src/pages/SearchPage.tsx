import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShopListingLayout } from "../components/shop/ShopListingLayout";
import { ProductGrid } from "../components/ProductGrid";
import { PageContainer } from "../components/PageContainer";
import { InfiniteScrollFooter, ProductGridSkeleton } from "../components/InfiniteScrollFooter";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";

export function SearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const list = useInfiniteProducts(query ? { shop: "fresh", q: query } : null);
  const noResults = !list.initialLoading && !list.error && !list.hasMore && !list.products.length;

  return (
    <PageContainer className="py-6 sm:py-8 pb-8 sm:pb-16 w-full">
      {query && <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words mb-6">
        {t(noResults ? "search.noResults" : "search.forQuery", { query })}
      </h1>}
      {!query || noResults ? (
        <div className="card p-8 sm:p-12 text-center max-w-md mx-auto w-full">
          <p className="text-text-muted">{t("search.tryDifferent")}</p>
          <Link to="/categories" className="btn-primary mt-6 inline-flex">{t("cart.browseCategories")}</Link>
        </div>
      ) : list.initialLoading ? <ProductGridSkeleton gridClassName="product-grid" /> : (
        <>
          <ShopListingLayout key={query} products={list.products} header={null} searchQuery={query}>
            {(products) => <ProductGrid products={products} />}
          </ShopListingLayout>
          <InfiniteScrollFooter sentinelRef={list.sentinelRef} hasMore={list.hasMore}
            loading={list.loading} error={list.error} onRetry={list.retry} count={list.products.length} />
        </>
      )}
    </PageContainer>
  );
}

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { KitchenIkeaProductCard } from "../components/kitchen/KitchenIkeaProductCard";
import { useKitchenCatalog } from "../hooks/useKitchenCatalog";
import { productMatchesSearch } from "../utils/searchMatch";

const PAGE_SIZE = 36;

export function KitchenSearchPage() {
  const { t } = useTranslation();
  const { kitchenProducts, loading } = useKitchenCatalog();
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const [visible, setVisible] = useState(PAGE_SIZE);

  const results = useMemo(() => {
    if (!query) return [];
    return kitchenProducts.filter((p) => productMatchesSearch(p, query));
  }, [kitchenProducts, query]);

  const shown = results.slice(0, visible);
  const remaining = Math.max(0, results.length - shown.length);

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
              ? results.length === 0
                ? t("search.noResults", { query })
                : t("search.forQuery", { query })
              : t("kitchen.searchTitle")}
          </h1>
          {query ? (
            <p>{t("kitchen.categoryCount", { count: results.length })}</p>
          ) : (
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
        ) : loading && kitchenProducts.length === 0 ? (
          <p className="kitchen-home-empty">{t("common.loading")}</p>
        ) : shown.length === 0 ? (
          <div className="kitchen-home-empty">
            <p>{t("search.tryDifferent")}</p>
            <Link to="/kitchen/categories" className="kitchen-home-reset">
              {t("kitchen.navCategories")}
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

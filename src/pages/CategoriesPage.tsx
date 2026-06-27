import { useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { useProducts } from "../context/ProductsContext";
import { AGRI_CATEGORIES, getCategoryDisplayName } from "../data/categories";
import { CategoriesAisleCarousel } from "../components/categories/CategoriesAisleCarousel";
import { useCart } from "../context/CartContext";
import { useCategoryName } from "../i18n/useLocalizedProduct";

const FEATURED_AISLE = "featured";
const PRODUCTS_PER_ROW = 14;

export function CategoriesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, getProductsByCategory } = useProducts();
  const { itemCount, openBasket } = useCart();

  const list = categories.length
    ? categories
    : AGRI_CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon }));

  const activeAisle = searchParams.get("aisle") ?? FEATURED_AISLE;
  const aisleIds = useMemo(
    () => [FEATURED_AISLE, ...list.map((c) => c.id)],
    [list]
  );

  const setAisle = useCallback(
    (id: string) => {
      if (id === FEATURED_AISLE) {
        searchParams.delete("aisle");
        setSearchParams(searchParams, { replace: true });
      } else {
        setSearchParams({ aisle: id }, { replace: true });
      }
    },
    [searchParams, setSearchParams]
  );

  const nextAisle = useCallback(() => {
    const idx = Math.max(0, aisleIds.indexOf(activeAisle));
    const next = aisleIds[(idx + 1) % aisleIds.length];
    setAisle(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeAisle, aisleIds, setAisle]);

  const categoriesWithProducts = useMemo(() => {
    return list
      .map((cat) => ({
        cat,
        products: getProductsByCategory(cat.id).slice(0, PRODUCTS_PER_ROW),
      }))
      .filter((row) => row.products.length > 0);
  }, [list, getProductsByCategory]);

  const activeCategory = list.find((c) => c.id === activeAisle);

  const headerTitle =
    activeAisle === FEATURED_AISLE
      ? t("categories.fresh.pageTitle")
      : getCategoryDisplayName(activeAisle, (key, opts) =>
          t(key, { defaultValue: opts?.defaultValue })
        );

  const headerIcon =
    activeAisle === FEATURED_AISLE
      ? "🛒"
      : activeCategory?.icon ?? AGRI_CATEGORIES.find((a) => a.id === activeAisle)?.icon ?? "📦";

  const aisleCarousels = useMemo(() => {
    if (activeAisle === FEATURED_AISLE) {
      return categoriesWithProducts.map(({ cat, products: rowProducts }, index) => ({
        key: cat.id,
        title: getCategoryDisplayName(cat.id, (key, opts) =>
          t(key, { defaultValue: opts?.defaultValue ?? cat.name })
        ),
        badge: index === 0 ? t("categories.fresh.newBadge") : undefined,
        seeMoreHref: `/category/${cat.id}`,
        seeMoreLabel: t("categories.fresh.seeCategory", {
          category: getCategoryDisplayName(cat.id, (key, opts) =>
            t(key, { defaultValue: opts?.defaultValue ?? cat.name })
          ),
        }),
        products: rowProducts,
      }));
    }

    const inCategory = getProductsByCategory(activeAisle);
    const deals = inCategory
      .filter((p) => p.originalPrice != null && p.originalPrice > p.price)
      .slice(0, PRODUCTS_PER_ROW);
    const all = inCategory.slice(0, PRODUCTS_PER_ROW);
    const name = getCategoryDisplayName(activeAisle, (key, opts) =>
      t(key, { defaultValue: opts?.defaultValue })
    );

    const rows: {
      key: string;
      title: string;
      badge?: string;
      seeMoreHref: string;
      seeMoreLabel?: string;
      products: typeof inCategory;
    }[] = [];

    if (deals.length >= 3) {
      rows.push({
        key: `${activeAisle}-deals`,
        title: t("categories.fresh.dealsRow", { category: name }),
        badge: t("categories.fresh.newBadge"),
        seeMoreHref: `/category/${activeAisle}`,
        products: deals,
      });
    }

    if (all.length > 0) {
      rows.push({
        key: `${activeAisle}-all`,
        title: name,
        seeMoreHref: `/category/${activeAisle}`,
        seeMoreLabel: t("categories.fresh.seeCategory", { category: name }),
        products: all,
      });
    }

    return rows;
  }, [activeAisle, categoriesWithProducts, getProductsByCategory, t]);

  return (
    <div className="categories-fresh-page">
      <div className="categories-fresh-layout">
        <main className="categories-fresh-main">
          <PageContainer className="categories-fresh-container">
            <header className="categories-fresh-header">
              <div className="categories-fresh-title-row">
                <h1 className="categories-fresh-title">
                  <span className="categories-fresh-title-icon" aria-hidden>
                    {headerIcon}
                  </span>
                  {headerTitle}
                </h1>
                <button type="button" className="categories-fresh-next-aisle" onClick={nextAisle}>
                  {t("categories.fresh.nextAisle")} →
                </button>
              </div>

              <nav className="categories-fresh-tabs" aria-label={t("categories.filterLabel")}>
                <Link
                  to="/categories"
                  className={`categories-fresh-tab${activeAisle === FEATURED_AISLE ? " is-active" : ""}`}
                  aria-current={activeAisle === FEATURED_AISLE ? "page" : undefined}
                >
                  {t("categories.fresh.featured")}
                </Link>
                {list.map((cat) => (
                  <CategoryTab key={cat.id} id={cat.id} active={activeAisle === cat.id} />
                ))}
              </nav>
            </header>

            <div className="categories-fresh-carousels">
              {aisleCarousels.length === 0 ? (
                <div className="categories-fresh-empty card p-8 text-center">
                  <p className="text-text-muted">{t("category.noProducts")}</p>
                  <Link to="/products" className="btn-primary mt-4 inline-flex">
                    {t("products.viewCatalogue")}
                  </Link>
                </div>
              ) : (
                aisleCarousels.map((row) => (
                  <CategoriesAisleCarousel
                    key={row.key}
                    title={row.title}
                    badge={row.badge}
                    seeMoreHref={row.seeMoreHref}
                    seeMoreLabel={row.seeMoreLabel}
                    products={row.products}
                  />
                ))
              )}
            </div>
          </PageContainer>
        </main>
      </div>

      <div className="categories-fresh-mobile-cart">
        {itemCount > 0 ? (
          <Link to="/cart" className="categories-fresh-mobile-cart-btn">
            {t("basketPanel.viewBasket", { count: itemCount })}
          </Link>
        ) : (
          <button
            type="button"
            className="categories-fresh-mobile-cart-btn"
            onClick={() => openBasket()}
          >
            {t("categories.fresh.goToBasket")}
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryTab({ id, active }: { id: string; active: boolean }) {
  const name = useCategoryName(id);
  return (
    <Link
      to={`/categories?aisle=${encodeURIComponent(id)}`}
      className={`categories-fresh-tab${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {name}
    </Link>
  );
}

import { useMemo, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { useProducts } from "../context/ProductsContext";
import { AGRI_CATEGORIES, getCategoryDisplayName } from "../data/categories";
import { CategoriesAisleCarousel } from "../components/categories/CategoriesAisleCarousel";
import { useCart } from "../context/CartContext";
import { useCategoryName } from "../i18n/useLocalizedProduct";
import { isExportOnlyCart } from "../utils/exportOrder";
import { SPECIALTY_SHOP_CATEGORY_IDS } from "../utils/shopMode";
import { fetchProductListPage } from "../api/client";
import { useNearViewport } from "../hooks/useKitchenAisleShelf";
import type { Product } from "../types/product";

const FEATURED_AISLE = "featured";
const PRODUCTS_PER_ROW = 14;
const EAGER_ROWS = 2;

export function CategoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useProducts();
  const { itemCount, openBasket, items } = useCart();

  const openCartOrExport = () => {
    if (isExportOnlyCart(items)) {
      navigate("/exports/confirmation");
      return;
    }
    openBasket();
  };

  const list = (categories.length
    ? categories
    : AGRI_CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
  ).filter((c) => !SPECIALTY_SHOP_CATEGORY_IDS.has(c.id));

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

  const selectedName =
    activeAisle === FEATURED_AISLE
      ? ""
      : getCategoryDisplayName(activeAisle, (key, opts) =>
          t(key, { defaultValue: opts?.defaultValue })
        );

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
              {activeAisle === FEATURED_AISLE ? (
                list.map((cat, index) => (
                  <FreshCategoryRow
                    key={cat.id}
                    categoryId={cat.id}
                    title={getCategoryDisplayName(cat.id, (key, opts) =>
                      t(key, { defaultValue: opts?.defaultValue ?? cat.name })
                    )}
                    badge={index === 0 ? t("categories.fresh.newBadge") : undefined}
                    eager={index < EAGER_ROWS}
                  />
                ))
              ) : (
                <>
                  <FreshCategoryRow
                    categoryId={activeAisle}
                    title={t("categories.fresh.dealsRow", { category: selectedName })}
                    seeMoreName={selectedName}
                    badge={t("categories.fresh.newBadge")}
                    eager
                    sale
                    minCount={3}
                  />
                  <FreshCategoryRow
                    categoryId={activeAisle}
                    title={selectedName}
                    eager
                    emptyLabel
                  />
                </>
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
            onClick={() => openCartOrExport()}
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

function FreshCategoryRow({
  categoryId,
  title,
  seeMoreName,
  badge,
  eager = false,
  sale = false,
  minCount = 1,
  emptyLabel = false,
}: {
  categoryId: string;
  title: string;
  seeMoreName?: string;
  badge?: string;
  eager?: boolean;
  sale?: boolean;
  minCount?: number;
  emptyLabel?: boolean;
}) {
  const { t } = useTranslation();
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const enabled = eager || near;
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setStatus("loading");
    fetchProductListPage(
      { shop: "fresh", category: categoryId, ...(sale ? { sale: true } : {}) },
      0,
      PRODUCTS_PER_ROW,
      controller.signal
    )
      .then((page) => {
        if (controller.signal.aborted) return;
        setProducts(page.products);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [categoryId, enabled, sale]);

  if (!enabled) return <div ref={ref} />;

  if (status === "loading" || status === "idle") {
    return (
      <div ref={ref} className="fresh-aisle-carousel" aria-busy="true">
        <div className="fresh-aisle-carousel-head">
          <h2 className="fresh-aisle-carousel-title">{title}</h2>
        </div>
        <p className="text-text-muted text-sm px-1">{t("common.loading")}</p>
      </div>
    );
  }

  if (status === "error") {
    return <div ref={ref} />;
  }

  if (products.length < minCount) {
    if (!emptyLabel) return <div ref={ref} />;
    return (
      <div ref={ref} className="categories-fresh-empty card p-8 text-center">
        <p className="text-text-muted">{t("category.noProducts")}</p>
        <Link to="/products" className="btn-primary mt-4 inline-flex">
          {t("products.viewCatalogue")}
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <CategoriesAisleCarousel
        title={title}
        badge={badge}
        seeMoreHref={`/category/${categoryId}`}
        seeMoreLabel={t("categories.fresh.seeCategory", { category: seeMoreName ?? title })}
        products={products}
      />
    </div>
  );
}

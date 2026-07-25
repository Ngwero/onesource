import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductsContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { useCategoryName, useKitchenAisleTitle } from "../i18n/useLocalizedProduct";
import { BrandLogo } from "./BrandLogo";
import { AccountMenu } from "./AccountMenu";
import { isExportOnlyCart } from "../utils/exportOrder";
import { KITCHEN_WARE_AISLES, KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWare";
import { isKitchenPath, kitchenAislePath } from "../utils/kitchenMode";

function NavCategoryLink({ id, icon }: { id: string; icon: string }) {
  const location = useLocation();
  const name = useCategoryName(id);
  const active = location.pathname === `/category/${id}`;
  return (
    <Link
      to={`/category/${id}`}
      className={`site-header-chip${active ? " is-active" : ""}`}
    >
      {icon} {name}
    </Link>
  );
}

function KitchenAisleOption({ id }: { id: string }) {
  const title = useKitchenAisleTitle(id);
  return <option value={id}>{title}</option>;
}

function KitchenAisleChip({ id, icon }: { id: string; icon: string }) {
  const location = useLocation();
  const title = useKitchenAisleTitle(id);
  const href = kitchenAislePath(id);
  return (
    <Link
      to={href}
      className={chipClass(location.pathname === href)}
    >
      {icon} {title}
    </Link>
  );
}

function chipClass(active: boolean) {
  return `site-header-chip${active ? " is-active" : ""}`;
}

export function Header() {
  const { t } = useTranslation();
  const { categories, getProductCountByCategory } = useProducts();
  const counts = getProductCountByCategory();
  const freshCategories = categories.filter(
    (c) =>
      c.id !== KITCHEN_WARE_CATEGORY_ID && (counts[c.id] ?? 0) > 0
  );
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { itemCount, openBasket, basketOpen, items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const kitchenMode = isKitchenPath(location.pathname);
  const headerRef = useRef<HTMLElement>(null);
  const [spacerHeight, setSpacerHeight] = useState(120);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const openCartOrExport = () => {
    if (isExportOnlyCart(items)) {
      navigate("/exports/confirmation");
      return;
    }
    openBasket();
  };

  useEffect(() => {
    setSearch("");
  }, [kitchenMode]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const update = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      setSpacerHeight(h);
      document.documentElement.style.setProperty("--site-header-height", `${h}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [categories.length, user, itemCount, scrolled, kitchenMode]);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 12);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress(max > 0 ? Math.min(1, y / max) : 0);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      const base = kitchenMode ? "/kitchen/search" : "/search";
      navigate(`${base}?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <>
      <header
        ref={headerRef}
        className={`site-header border-b border-border${scrolled ? " site-header--scrolled" : ""}${kitchenMode ? " site-header--kitchen" : " site-header--fresh"}`}
      >
        <div className="site-header-progress" aria-hidden>
          <div
            className="site-header-progress-bar"
            style={{ transform: `scaleX(${scrollProgress})` }}
          />
        </div>

        <div className="page-container w-full relative">
          {/* Always-visible shop switcher — Fresh vs Kitchen */}
          <div
            className="site-shop-switcher"
            role="navigation"
            aria-label={t("header.shopSwitcherLabel")}
          >
            <p className="site-shop-switcher-label">
              {t("header.shopSwitcherLabel")}
            </p>
            <div className="site-shop-switcher-track" role="tablist">
              <Link
                to="/"
                role="tab"
                aria-selected={!kitchenMode}
                className={`site-shop-switch${kitchenMode ? "" : " is-active"}`}
              >
                <span className="site-shop-switch-icon" aria-hidden>
                  🥬
                </span>
                <span className="site-shop-switch-copy">
                  <strong>{t("header.shopFresh")}</strong>
                  <span>{t("header.shopFreshHint")}</span>
                </span>
              </Link>
              <Link
                to="/kitchen"
                role="tab"
                aria-selected={kitchenMode}
                className={`site-shop-switch${kitchenMode ? " is-active" : ""}`}
              >
                <span className="site-shop-switch-icon" aria-hidden>
                  🍳
                </span>
                <span className="site-shop-switch-copy">
                  <strong>{t("header.shopKitchen")}</strong>
                  <span>{t("header.shopKitchenHint")}</span>
                </span>
              </Link>
            </div>
          </div>

          <div className="site-header-row flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 py-3 sm:py-4 w-full">
            <Link
              to={kitchenMode ? "/kitchen" : "/"}
              className="site-header-brand flex-shrink-0 min-w-0 order-1"
            >
              <BrandLogo
                variant="horizontal"
                className="site-header-brand-icon md:hidden h-8 max-w-[150px]"
              />
              <BrandLogo
                variant="horizontal"
                className="hidden md:block h-9 sm:h-10 md:h-11 max-w-[min(220px,48vw)]"
              />
              <span className="site-header-shop-badge">
                {kitchenMode
                  ? t("header.shopKitchen")
                  : t("header.shopFresh")}
              </span>
            </Link>

            <form
              onSubmit={handleSearch}
              className="site-header-search-form flex-1 min-w-0 w-full order-3 md:order-2"
            >
              <div className="site-header-search flex w-full rounded-xl sm:rounded-2xl bg-muted border border-border overflow-hidden focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 transition-all">
                {kitchenMode ? (
                  <select
                    className="hidden lg:block bg-transparent text-text-muted text-xs px-3 py-2.5 sm:py-3 border-r border-border outline-none cursor-pointer hover:text-text w-[110px] xl:w-[160px] flex-shrink-0"
                    defaultValue="all"
                    key="kitchen-aisle-select"
                    onChange={(e) => {
                      if (e.target.value === "all") navigate("/kitchen/products");
                      else navigate(kitchenAislePath(e.target.value));
                    }}
                  >
                    <option value="all">{t("kitchen.home.allCategories")}</option>
                    {KITCHEN_WARE_AISLES.map((aisle) => (
                      <KitchenAisleOption key={aisle.id} id={aisle.id} />
                    ))}
                  </select>
                ) : (
                  <select
                    className="hidden lg:block bg-transparent text-text-muted text-xs px-3 py-2.5 sm:py-3 border-r border-border outline-none cursor-pointer hover:text-text w-[110px] xl:w-[140px] flex-shrink-0"
                    defaultValue="all"
                    key="fresh-category-select"
                    onChange={(e) => {
                      if (e.target.value !== "all") {
                        navigate(`/category/${e.target.value}`);
                      }
                    }}
                  >
                    <option value="all">{t("header.allProduce")}</option>
                    {freshCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {t(`categories.names.${c.id}`)}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    kitchenMode
                      ? t("header.kitchenSearchPlaceholder")
                      : t("header.searchPlaceholder")
                  }
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm bg-transparent outline-none placeholder:text-text-muted/70"
                />
                <button
                  type="submit"
                  className="px-3 sm:px-5 bg-accent hover:bg-accent-hover text-white transition-colors flex-shrink-0 min-w-[44px] sm:min-w-[48px]"
                  aria-label={t("common.search")}
                >
                  <svg
                    className="w-5 h-5 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
            </form>

            <div className="site-header-actions flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0 order-2 md:order-3 ml-auto md:ml-0">
              <CurrencySwitcher />
              <LanguageSwitcher />

              <Link
                to={user ? "/account" : "/login"}
                state={user ? undefined : { from: "/account" }}
                className="hidden xl:flex flex-col items-end px-3 py-2 rounded-xl hover:bg-muted transition-colors text-right"
              >
                <span className="text-[10px] text-text-muted uppercase tracking-wide">
                  {t("header.deliverTo")}
                </span>
                <span className="text-xs font-semibold">
                  {t("header.unitedKingdom")}
                </span>
              </Link>

              <AccountMenu />

              <Link
                to={user ? "/orders" : "/login"}
                state={user ? undefined : { from: "/orders" }}
                className="hidden lg:flex flex-col items-start px-2 py-2 rounded-xl hover:bg-muted transition-colors min-h-[44px] justify-center"
              >
                <span className="text-[10px] text-text-muted leading-tight">
                  {t("accountMenu.returns")}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-text leading-tight">
                  {t("accountMenu.orders")}
                </span>
              </Link>

              <button
                type="button"
                className={`header-basket-btn header-basket-btn--desktop${basketOpen ? " is-active" : ""}`}
                aria-label={t("header.basket")}
                onClick={() => openCartOrExport()}
              >
                <span className="header-basket-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </span>
                <span className="header-basket-label">{t("header.basket")}</span>
                {itemCount > 0 && (
                  <span className="header-basket-badge">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Category strip — only the active shop */}
          <nav
            className="site-header-nav horizontal-scroll flex items-center gap-2 pb-3 sm:pb-4 scrollbar-hide -mx-1 px-1"
            aria-label={
              kitchenMode
                ? t("kitchen.home.navLabel")
                : t("nav.categoriesLabel")
            }
          >
            {kitchenMode ? (
              <>
                <span className="site-header-nav-scope" aria-hidden>
                  {t("header.shopKitchen")}
                </span>
                <Link
                  to="/kitchen"
                  className={chipClass(location.pathname === "/kitchen")}
                >
                  {t("kitchen.home.feedBest")}
                </Link>
                <Link
                  to="/kitchen/categories"
                  className={chipClass(
                    location.pathname === "/kitchen/categories"
                  )}
                >
                  {t("kitchen.navCategories")}
                </Link>
                <Link
                  to="/kitchen/products"
                  className={chipClass(
                    location.pathname === "/kitchen/products" &&
                      !location.search.includes("sale=1")
                  )}
                >
                  {t("kitchen.navAll")}
                </Link>
                <Link
                  to="/kitchen/products?sale=1"
                  className={chipClass(
                    location.pathname === "/kitchen/products" &&
                      location.search.includes("sale=1")
                  )}
                >
                  {t("kitchen.home.feedOffers")}
                </Link>
                {KITCHEN_WARE_AISLES.map((aisle) => (
                  <KitchenAisleChip
                    key={aisle.id}
                    id={aisle.id}
                    icon={aisle.icon}
                  />
                ))}
              </>
            ) : (
              <>
                <span className="site-header-nav-scope" aria-hidden>
                  {t("header.shopFresh")}
                </span>
                <Link
                  to="/categories"
                  className={chipClass(location.pathname === "/categories")}
                >
                  {t("nav.allCategories")}
                </Link>
                <Link
                  to="/products"
                  className={chipClass(
                    location.pathname === "/products" &&
                      !location.search.includes("sale=1")
                  )}
                >
                  {t("nav.allProducts")}
                </Link>
                <Link
                  to="/search?q=organic"
                  className={chipClass(
                    location.pathname === "/search" &&
                      location.search.includes("q=organic")
                  )}
                >
                  {t("nav.britishGrown")}
                </Link>
                <Link
                  to="/exports"
                  className={chipClass(location.pathname === "/exports")}
                >
                  ✈️ {t("nav.exports")}
                </Link>
                <Link
                  to="/products?sale=1"
                  className={chipClass(
                    location.pathname === "/products" &&
                      location.search.includes("sale=1")
                  )}
                >
                  {t("nav.seasonalDeals")}
                </Link>
                {freshCategories.map((c) => (
                  <NavCategoryLink key={c.id} id={c.id} icon={c.icon} />
                ))}
              </>
            )}
          </nav>
        </div>
      </header>
      <div
        className="site-header-spacer"
        style={{ height: spacerHeight }}
        aria-hidden
      />
    </>
  );
}

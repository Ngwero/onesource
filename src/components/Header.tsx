import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductsContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { useCategoryName } from "../i18n/useLocalizedProduct";
import { BrandLogo } from "./BrandLogo";
import { AccountMenu } from "./AccountMenu";

function NavCategoryLink({ id, icon }: { id: string; icon: string }) {
  const location = useLocation();
  const name = useCategoryName(id);
  const active = location.pathname === `/category/${id}`;
  return (
    <Link
      to={`/category/${id}`}
      className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? "bg-accent text-white shadow-sm"
          : "bg-muted text-text-muted hover:bg-accent-light hover:text-accent"
      }`}
    >
      {icon} {name}
    </Link>
  );
}

export function Header() {
  const { t } = useTranslation();
  const { categories, getProductCountByCategory } = useProducts();
  const categoriesWithProducts = categories.filter(
    (c) => (getProductCountByCategory()[c.id] ?? 0) > 0
  );
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { itemCount, openBasket, basketOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const [spacerHeight, setSpacerHeight] = useState(120);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

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
  }, [categories.length, user, itemCount, scrolled]);

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
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <>
    <header
      ref={headerRef}
      className={`site-header border-b border-border${scrolled ? " site-header--scrolled" : ""}`}
    >
      <div
        className="site-header-progress"
        aria-hidden
      >
        <div
          className="site-header-progress-bar"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      <div className="page-container w-full relative">
        {/* Logo · Search (centre) · Actions — one row */}
        <div className="site-header-row flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 py-3 sm:py-4 w-full">
          <Link to="/" className="site-header-brand flex-shrink-0 min-w-0 order-1">
            <BrandLogo variant="icon" className="site-header-brand-icon md:hidden" />
            <BrandLogo responsive className="hidden md:block" />
          </Link>

          <form
            onSubmit={handleSearch}
            className="site-header-search-form flex-1 min-w-0 w-full order-3 md:order-2"
          >
            <div className="site-header-search flex w-full rounded-xl sm:rounded-2xl bg-muted border border-border overflow-hidden focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 transition-all">
              <select
                className="hidden lg:block bg-transparent text-text-muted text-xs px-3 py-2.5 sm:py-3 border-r border-border outline-none cursor-pointer hover:text-text w-[110px] xl:w-[140px] flex-shrink-0"
                defaultValue="all"
                onChange={(e) => {
                  if (e.target.value !== "all") navigate(`/category/${e.target.value}`);
                }}
              >
                <option value="all">{t("header.allProduce")}</option>
                {categoriesWithProducts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(`categories.names.${c.id}`)}
                  </option>
                ))}
              </select>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("header.searchPlaceholder")}
                className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm bg-transparent outline-none placeholder:text-text-muted/70"
              />
              <button
                type="submit"
                className="px-3 sm:px-5 bg-accent hover:bg-accent-hover text-white transition-colors flex-shrink-0 min-w-[44px] sm:min-w-[48px]"
                aria-label={t("common.search")}
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
              <span className="text-xs font-semibold">{t("header.unitedKingdom")}</span>
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
              onClick={() => openBasket()}
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

        {/* Category nav — horizontal scroll */}
        <nav
          className="site-header-nav horizontal-scroll flex items-center gap-2 pb-3 sm:pb-4 scrollbar-hide -mx-1 px-1"
          aria-label={t("nav.categoriesLabel")}
        >
          <Link
            to="/categories"
            className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              location.pathname === "/categories"
                ? "bg-accent text-white shadow-sm"
                : "bg-muted text-text-muted hover:bg-accent-light hover:text-accent"
            }`}
          >
            {t("nav.allCategories")}
          </Link>
          <Link
            to="/products"
            className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              location.pathname === "/products" && !location.search.includes("sale=1")
                ? "bg-accent text-white shadow-sm"
                : "bg-muted text-text-muted hover:bg-accent-light hover:text-accent"
            }`}
          >
            {t("nav.allProducts")}
          </Link>
          <Link
            to="/search?q=organic"
            className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              location.pathname === "/search" && location.search.includes("q=organic")
                ? "bg-accent text-white shadow-sm"
                : "bg-muted text-text-muted hover:bg-accent-light hover:text-accent"
            }`}
          >
            {t("nav.britishGrown")}
          </Link>
          <Link
            to="/products?sale=1"
            className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              location.pathname === "/products" && location.search.includes("sale=1")
                ? "bg-accent text-white shadow-sm"
                : "bg-muted text-text-muted hover:bg-accent-light hover:text-accent"
            }`}
          >
            {t("nav.seasonalDeals")}
          </Link>
          {categoriesWithProducts.map((c) => (
            <NavCategoryLink key={c.id} id={c.id} icon={c.icon} />
          ))}
        </nav>
      </div>
    </header>
    <div className="site-header-spacer" style={{ height: spacerHeight }} aria-hidden />
    </>
  );
}

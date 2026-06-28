import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useProducts } from "../context/ProductsContext";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { categories, getProductCountByCategory } = useProducts();
  const categoriesWithProducts = categories.filter(
    (c) => (getProductCountByCategory()[c.id] ?? 0) > 0
  );
  const ordersTo = user ? "/orders" : "/login";
  const ordersState = user ? undefined : { from: "/orders" };

  return (
    <footer className="site-footer mt-auto border-t border-border bg-surface w-full">
      <div className="page-container py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="mb-4">
              <BrandLogo variant="primary" className="h-11 sm:h-12 max-w-[200px]" />
            </div>
            <p className="text-sm text-text-muted leading-relaxed max-w-md">{t("footer.tagline")}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-4">{t("footer.categories")}</h3>
            <ul className="space-y-2">
              {categoriesWithProducts.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/category/${c.id}`}
                    className="text-sm text-text-muted hover:text-accent transition-colors"
                  >
                    {t(`categories.names.${c.id}`)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/categories"
                  className="text-sm font-medium text-accent hover:underline transition-colors"
                >
                  {t("common.allCategories")} →
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-4">{t("footer.help")}</h3>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <Link to="/categories" className="hover:text-accent transition-colors">
                  {t("footer.deliveryInfo")}
                </Link>
              </li>
              <li>
                <Link to={ordersTo} state={ordersState} className="hover:text-accent transition-colors">
                  {t("footer.returns")}
                </Link>
              </li>
              <li>
                <Link to={ordersTo} state={ordersState} className="hover:text-accent transition-colors">
                  {t("footer.trackOrder")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-4">{t("footer.account")}</h3>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><Link to="/login" className="hover:text-accent transition-colors">{t("footer.signIn")}</Link></li>
              <li><Link to="/signup" className="hover:text-accent transition-colors">{t("auth.signUp")}</Link></li>
              <li>
                <Link to={user ? "/account" : "/login"} className="hover:text-accent transition-colors">
                  {t("auth.account")}
                </Link>
              </li>
              <li>
                <Link to={ordersTo} state={ordersState} className="hover:text-accent transition-colors">
                  {t("accountMenu.orders")}
                </Link>
              </li>
              <li>
                <Link to="/lists" className="hover:text-accent transition-colors">
                  {t("accountMenu.savedItems")}
                </Link>
              </li>
              <li><Link to="/cart" className="hover:text-accent transition-colors">{t("footer.yourBasket")}</Link></li>
              <li><Link to="/products" className="hover:text-accent transition-colors">{t("nav.allProducts")}</Link></li>
              <li><Link to="/categories" className="hover:text-accent transition-colors">{t("common.allCategories")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-text-muted">
          <p className="max-w-3xl">{t("footer.copyright")}</p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-muted whitespace-nowrap">🇬🇧 {t("footer.country")}</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted whitespace-nowrap">{t("footer.locale")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

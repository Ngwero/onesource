import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

type NavItem = {
  key: string;
  label: string;
  to?: string;
  state?: { from: string };
  match: (path: string) => boolean;
  onClick?: () => void;
  icon: (active: boolean) => ReactNode;
};

function NavIcon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg
      className={`w-6 h-6 ${active ? "text-accent" : "text-text-muted"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.25 : 2} d={d} />
    </svg>
  );
}

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { itemCount, openBasket } = useCart();

  const accountTo = user ? "/account" : "/login";
  const accountState = user ? undefined : { from: "/account" };

  const items: NavItem[] = [
    {
      key: "home",
      label: t("common.home"),
      to: "/",
      match: (p) => p === "/",
      icon: (active) => (
        <NavIcon
          active={active}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      ),
    },
    {
      key: "categories",
      label: t("nav.categoriesLabel"),
      to: "/categories",
      match: (p) => p.startsWith("/categories") || p.startsWith("/category/"),
      icon: (active) => (
        <NavIcon
          active={active}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      ),
    },
    {
      key: "search",
      label: t("common.search"),
      to: "/search",
      match: (p) => p.startsWith("/search"),
      icon: (active) => (
        <NavIcon
          active={active}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      ),
    },
    {
      key: "basket",
      label: t("header.basket"),
      match: () => false,
      onClick: () => openBasket(),
      icon: (active) => (
        <span className="relative">
          <NavIcon
            active={active}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
          {itemCount > 0 && (
            <span className="mobile-nav-badge">{itemCount > 99 ? "99+" : itemCount}</span>
          )}
        </span>
      ),
    },
    {
      key: "account",
      label: t("auth.account"),
      to: accountTo,
      state: accountState,
      match: (p) =>
        p.startsWith("/account") ||
        p.startsWith("/login") ||
        p.startsWith("/signup") ||
        p.startsWith("/orders"),
      icon: (active) => (
        <NavIcon
          active={active}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      ),
    },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label={t("nav.mobileLabel")}>
      <div className="mobile-bottom-nav-inner">
        {items.map((item) => {
          const active = item.match(pathname);
          const className = `mobile-bottom-nav-item${active ? " is-active" : ""}`;

          const content = (
            <>
              {item.icon(active)}
              <span className="mobile-bottom-nav-label">{item.label}</span>
            </>
          );

          if (item.onClick) {
            return (
              <button
                key={item.key}
                type="button"
                className={className}
                onClick={item.onClick}
                aria-label={item.label}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.key}
              to={item.to!}
              state={item.state}
              className={className}
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

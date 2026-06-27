import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { AccountHubCard } from "../components/account/AccountHubCard";
import { AccountHubLinkRow } from "../components/account/AccountHubLinkRow";
import { AccountHubSection } from "../components/account/AccountHubSection";
import {
  BasketIcon,
  CheckoutIcon,
  HistoryIcon,
  ListsIcon,
  OrdersIcon,
  ProduceIcon,
  ProductsIcon,
  SecurityIcon,
  SupportIcon,
} from "../components/account/AccountHubIcons";
import { useAuth } from "../context/AuthContext";

const hubCards = [
  { to: "/orders", titleKey: "orders", descKey: "orders", icon: OrdersIcon },
  { to: "/forgot-password", titleKey: "security", descKey: "security", icon: SecurityIcon },
  { to: "/categories", titleKey: "produce", descKey: "produce", icon: ProduceIcon },
  { to: "/lists", titleKey: "lists", descKey: "lists", icon: ListsIcon },
  { to: "/cart", titleKey: "basket", descKey: "basket", icon: BasketIcon },
  { to: "/history", titleKey: "history", descKey: "history", icon: HistoryIcon },
  { to: "/products", titleKey: "products", descKey: "products", icon: ProductsIcon },
  { to: "/checkout", titleKey: "checkout", descKey: "checkout", icon: CheckoutIcon },
  { to: "/orders", titleKey: "support", descKey: "support", icon: SupportIcon },
] as const;

const shopLinks = [
  { to: "/categories", key: "categories" },
  { to: "/products", key: "products" },
  { to: "/search", key: "search" },
  { to: "/", key: "home" },
] as const;

const activityLinks = [
  { to: "/orders", key: "orders" },
  { to: "/lists", key: "lists" },
  { to: "/history", key: "history" },
  { to: "/cart", key: "basket" },
] as const;

const accountLinks = [
  { to: "/forgot-password", key: "resetPassword" },
  { to: "/orders", key: "trackOrder" },
  { to: "/account", key: "yourAccount" },
] as const;

export function AccountPage() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <PageContainer className="account-hub-page py-8 sm:py-10">
      <div className="account-hub-hero">
        <div>
          <p className="account-hub-eyebrow">{t("accountPage.eyebrow")}</p>
          <h1 className="account-hub-title">{t("accountPage.title")}</h1>
        </div>

        <Link to="/forgot-password" className="account-hub-profile">
          <span className="account-hub-avatar" aria-hidden>
            {initials || "?"}
          </span>
          <span className="account-hub-profile-copy">
            <span className="account-hub-profile-name">{displayName}</span>
            <span className="account-hub-profile-email">{user?.email}</span>
          </span>
          <span className="account-hub-profile-action">
            {t("accountPage.manageAccount")}
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </Link>
      </div>

      <div className="account-hub-grid">
        {hubCards.map(({ to, titleKey, descKey, icon: Icon }) => (
          <AccountHubCard
            key={`${to}-${titleKey}`}
            to={to}
            title={t(`accountPage.cards.${titleKey}.title`)}
            description={t(`accountPage.cards.${descKey}.description`)}
            icon={<Icon />}
          />
        ))}
      </div>

      <div className="account-hub-sections">
        <AccountHubSection title={t("accountPage.sections.shop.title")} to="/categories">
          {shopLinks.map(({ to, key }) => (
            <AccountHubLinkRow
              key={key}
              to={to}
              label={t(`accountPage.sections.shop.links.${key}`)}
            />
          ))}
        </AccountHubSection>

        <AccountHubSection title={t("accountPage.sections.activity.title")} to="/orders">
          {activityLinks.map(({ to, key }) => (
            <AccountHubLinkRow
              key={key}
              to={to}
              label={t(`accountPage.sections.activity.links.${key}`)}
            />
          ))}
        </AccountHubSection>

        <AccountHubSection title={t("accountPage.sections.account.title")} to="/forgot-password">
          {accountLinks.map(({ to, key }) => (
            <AccountHubLinkRow
              key={key}
              to={to}
              label={t(`accountPage.sections.account.links.${key}`)}
            />
          ))}
          <AccountHubLinkRow label={t("auth.signOut")} onClick={handleSignOut} />
        </AccountHubSection>
      </div>
    </PageContainer>
  );
}

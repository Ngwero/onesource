import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

function MenuLink({
  to,
  onClick,
  state,
  children,
}: {
  to: string;
  onClick?: () => void;
  state?: { from: string };
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      state={state}
      onClick={onClick}
      className="block text-sm text-text hover:text-accent hover:underline py-1 transition-colors"
    >
      {children}
    </Link>
  );
}

export function AccountMenu() {
  const { t } = useTranslation();
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "";

  const greeting = user
    ? t("accountMenu.helloUser", { name: displayName })
    : t("accountMenu.helloGuest");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    close();
    await signOut();
    navigate("/");
  };

  return (
    <div
      ref={rootRef}
      className="relative hidden sm:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="flex flex-col items-start px-2 sm:px-3 py-2 rounded-xl hover:bg-muted transition-colors text-left min-h-[44px] justify-center"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[10px] text-text-muted leading-tight">
          {loading ? t("common.loading") : greeting}
        </span>
        <span className="text-xs sm:text-sm font-semibold text-text leading-tight">
          {t("accountMenu.accountAndLists")}
        </span>
      </button>

      {open && (
        <div
          className="account-menu-panel absolute right-0 top-full mt-1 z-[60] w-[min(100vw-2rem,520px)]"
          role="menu"
        >
          {user ? (
            <>
              <div className="account-menu-header flex items-start justify-between gap-3 border-b border-border pb-4 mb-4">
                <div className="flex gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-text truncate">{displayName}</p>
                    <p className="text-sm text-text-muted truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-sm font-semibold text-accent hover:text-accent-hover hover:underline shrink-0"
                >
                  {t("auth.signOut")}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h3 className="text-sm font-bold text-text mb-2">{t("accountMenu.yourLists")}</h3>
                  <ul className="space-y-1">
                    <li>
                      <MenuLink to="/lists" onClick={close}>
                        {t("accountMenu.savedItems")}
                      </MenuLink>
                    </li>
                    <li>
                      <MenuLink to="/products" onClick={close}>
                        {t("accountMenu.shopToSave")}
                      </MenuLink>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text mb-2">{t("accountMenu.yourAccount")}</h3>
                  <ul className="space-y-1">
                    <li>
                      <MenuLink to="/account" onClick={close}>
                        {t("auth.account")}
                      </MenuLink>
                    </li>
                    <li>
                      <MenuLink to="/orders" onClick={close}>
                        {t("accountMenu.orders")}
                      </MenuLink>
                    </li>
                    <li>
                      <MenuLink to="/history" onClick={close}>
                        {t("accountMenu.browsingHistory")}
                      </MenuLink>
                    </li>
                    <li>
                      <MenuLink to="/cart" onClick={close}>
                        {t("footer.yourBasket")}
                      </MenuLink>
                    </li>
                    <li>
                      <MenuLink to="/categories" onClick={close}>
                        {t("common.allCategories")}
                      </MenuLink>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">{t("accountMenu.signInPrompt")}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  to="/login"
                  onClick={close}
                  className="btn-primary flex-1 justify-center min-h-[44px]"
                >
                  {t("auth.signIn")}
                </Link>
                <Link
                  to="/signup"
                  onClick={close}
                  className="btn-secondary flex-1 justify-center min-h-[44px]"
                >
                  {t("auth.signUp")}
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-border">
                <div>
                  <h3 className="text-sm font-bold text-text mb-2">{t("accountMenu.yourLists")}</h3>
                  <MenuLink to="/signup" state={{ from: "/lists" }} onClick={close}>
                    {t("accountMenu.createList")}
                  </MenuLink>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text mb-2">{t("accountMenu.yourAccount")}</h3>
                  <MenuLink to="/login" state={{ from: "/orders" }} onClick={close}>
                    {t("accountMenu.orders")}
                  </MenuLink>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

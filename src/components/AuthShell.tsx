import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";

type AuthMode = "login" | "signup";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  mode?: AuthMode;
};

const BENEFIT_KEYS = ["auth.benefitOrders", "auth.benefitFresh", "auth.benefitCheckout"] as const;

export function AuthShell({ children, footer, mode = "login" }: Props) {
  const { t } = useTranslation();

  return (
    <div className="auth-shell">
      <div className="auth-shell-layout">
        <aside className="auth-shell-brand" aria-hidden="true">
          <div className="auth-shell-brand-inner">
            <BrandLogo variant="onDarkHorizontal" className="h-10 sm:h-11" />
            <p className="auth-shell-brand-tagline">
              {mode === "signup" ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
            </p>
            <ul className="auth-shell-benefits">
              {BENEFIT_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="auth-shell-main">
          <Link to="/" className="auth-shell-logo auth-shell-logo--mobile">
            <BrandLogo variant="primary" className="h-10 sm:h-11" />
          </Link>
          <div className="auth-shell-card">{children}</div>
          {footer ? <div className="auth-shell-footer">{footer}</div> : null}
          <Link to="/" className="auth-shell-back-shop">
            {t("auth.continueToShop")}
          </Link>
        </div>
      </div>
    </div>
  );
}

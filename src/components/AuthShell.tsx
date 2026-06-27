import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ children, footer }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <Link to="/" className="auth-shell-logo">
          <BrandLogo variant="primary" className="h-10 sm:h-11" />
        </Link>
        <div className="auth-shell-card">{children}</div>
        {footer ? <div className="auth-shell-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

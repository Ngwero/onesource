import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Props = {
  title: string;
  to: string;
  children: ReactNode;
};

export function AccountHubSection({ title, to, children }: Props) {
  return (
    <section className="account-hub-section-card">
      <Link to={to} className="account-hub-section-header">
        <h2 className="account-hub-section-title">{title}</h2>
        <svg
          className="account-hub-section-chevron"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
      <div className="account-hub-section-body">{children}</div>
    </section>
  );
}

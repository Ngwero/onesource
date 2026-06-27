import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Props = {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
};

function Chevron() {
  return (
    <svg
      className="account-hub-card-chevron"
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
  );
}

export function AccountHubCard({ to, title, description, icon }: Props) {
  return (
    <Link to={to} className="account-hub-card group">
      <span className="account-hub-card-icon">{icon}</span>
      <span className="account-hub-card-copy">
        <span className="account-hub-card-title">{title}</span>
        <span className="account-hub-card-desc">{description}</span>
      </span>
      <Chevron />
    </Link>
  );
}

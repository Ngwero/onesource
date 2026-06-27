import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type BaseProps = {
  label: string;
  icon?: ReactNode;
};

type LinkRowProps = BaseProps & {
  to: string;
  onClick?: never;
};

type ButtonRowProps = BaseProps & {
  to?: never;
  onClick: () => void;
};

type Props = LinkRowProps | ButtonRowProps;

function Chevron() {
  return (
    <svg
      className="account-hub-link-chevron"
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

export function AccountHubLinkRow({ label, icon, to, onClick }: Props) {
  const content = (
    <>
      {icon ? <span className="account-hub-link-icon">{icon}</span> : null}
      <span className="account-hub-link-label">{label}</span>
      <Chevron />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="account-hub-link-row">
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className="account-hub-link-row">
      {content}
    </Link>
  );
}

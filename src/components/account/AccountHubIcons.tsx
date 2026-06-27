import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function IconWrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`account-hub-icon ${className}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

export function OrdersIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="10" y="14" width="28" height="22" rx="2" fill="#edf3e0" stroke="#2e5e4a" strokeWidth="1.5" />
        <path d="M10 20h28" stroke="#2e5e4a" strokeWidth="1.5" />
        <circle cx="24" cy="28" r="5" fill="#fff" stroke="#2e5e4a" strokeWidth="1.5" />
        <path d="M22 28h4M24 26v4" stroke="#2e5e4a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconWrap>
  );
}

export function SecurityIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <path
          d="M24 8l14 6v10c0 8.5-6 14.5-14 16-8-1.5-14-7.5-14-16V14l14-6z"
          fill="#dbeafe"
          stroke="#2563eb"
          strokeWidth="1.5"
        />
        <circle cx="24" cy="24" r="4" fill="#fff" stroke="#2563eb" strokeWidth="1.5" />
        <path d="M24 22v3" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconWrap>
  );
}

export function ProduceIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="16" fill="#edf3e0" />
        <path
          d="M24 14c-2 4-6 6-8 10 2 4 6 6 8 10 2-4 6-6 8-10-2-4-6-6-8-10z"
          fill="#2e5e4a"
        />
        <path d="M24 12v4" stroke="#b4cf5a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </IconWrap>
  );
}

export function ListsIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="12" y="10" width="24" height="28" rx="3" fill="#f3f2ee" stroke="#2e5e4a" strokeWidth="1.5" />
        <path d="M17 18h14M17 24h14M17 30h9" stroke="#2e5e4a" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="34" cy="34" r="7" fill="#edf3e0" stroke="#2e5e4a" strokeWidth="1.5" />
        <path d="M32 34h4M34 32v4" stroke="#2e5e4a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconWrap>
  );
}

export function BasketIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <path
          d="M14 18h22l-2 18H16L14 18z"
          fill="#edf3e0"
          stroke="#2e5e4a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M12 14h26l2 4H10l2-4z" fill="#2e5e4a" />
        <circle cx="20" cy="40" r="2" fill="#2e5e4a" />
        <circle cx="30" cy="40" r="2" fill="#2e5e4a" />
      </svg>
    </IconWrap>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="14" fill="#f3f2ee" stroke="#2e5e4a" strokeWidth="1.5" />
        <path d="M24 14v10l7 5" stroke="#2e5e4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrap>
  );
}

export function ProductsIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="10" y="12" width="12" height="12" rx="2" fill="#edf3e0" stroke="#2e5e4a" strokeWidth="1.5" />
        <rect x="26" y="12" width="12" height="12" rx="2" fill="#edf3e0" stroke="#2e5e4a" strokeWidth="1.5" />
        <rect x="10" y="28" width="12" height="12" rx="2" fill="#edf3e0" stroke="#2e5e4a" strokeWidth="1.5" />
        <rect x="26" y="28" width="12" height="12" rx="2" fill="#edf3e0" stroke="#2e5e4a" strokeWidth="1.5" />
      </svg>
    </IconWrap>
  );
}

export function CheckoutIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="10" y="16" width="28" height="20" rx="3" fill="#f0c947" stroke="#c9920f" strokeWidth="1.5" />
        <rect x="10" y="22" width="28" height="6" fill="#2e5e4a" />
        <rect x="14" y="32" width="10" height="2" rx="1" fill="#fff" />
      </svg>
    </IconWrap>
  );
}

export function SupportIcon({ className }: IconProps) {
  return (
    <IconWrap className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <path
          d="M10 28c0-7.7 6.3-14 14-14s14 6.3 14 14v4H10v-4z"
          fill="#edf3e0"
          stroke="#2e5e4a"
          strokeWidth="1.5"
        />
        <path d="M16 32v4a8 8 0 0016 0v-4" stroke="#2e5e4a" strokeWidth="1.5" />
        <circle cx="24" cy="22" r="3" fill="#2e5e4a" />
      </svg>
    </IconWrap>
  );
}

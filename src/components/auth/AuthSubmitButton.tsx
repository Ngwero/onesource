import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  children: ReactNode;
};

export function AuthSubmitButton({ loading, children, disabled, className = "", ...props }: Props) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`btn-primary auth-submit-btn w-full min-h-[48px] disabled:opacity-50 ${className}`.trim()}
      {...props}
    >
      {loading ? <span className="auth-spinner" aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}

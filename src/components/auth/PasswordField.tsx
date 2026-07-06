import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  label: ReactNode;
  labelExtra?: ReactNode;
  hint?: ReactNode;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-2.05 3.32M6.61 6.61A11.33 11.33 0 0 0 3 12.5C4.73 16.89 9 20 14 20a10.7 10.7 0 0 0 4.39-.91"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12.5C3.73 8.11 8 5 13 5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S3.73 16.89 2 12.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function PasswordField({ id, label, labelExtra, hint, className = "", ...props }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-field">
      {labelExtra ? (
        <div className="form-label-row">
          <label htmlFor={id} className="form-label">
            {label}
          </label>
          {labelExtra}
        </div>
      ) : (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      <div className="auth-password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={`form-input auth-password-input ${className}`.trim()}
          {...props}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={visible}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
      {hint ? <p className="auth-field-hint">{hint}</p> : null}
    </div>
  );
}

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  label: ReactNode;
  labelExtra?: ReactNode;
  hint?: ReactNode;
};

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
        >
          {visible ? t("auth.hidePassword") : t("auth.showPassword")}
        </button>
      </div>
      {hint ? <p className="auth-field-hint">{hint}</p> : null}
    </div>
  );
}

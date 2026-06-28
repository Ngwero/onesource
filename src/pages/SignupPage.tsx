import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../components/AuthShell";
import { AuthSubmitButton } from "../components/auth/AuthSubmitButton";
import { PasswordField } from "../components/auth/PasswordField";
import { useAuth } from "../context/AuthContext";

function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < 6) return 0;
  if (password.length < 8) return 1;
  if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 3;
  return 2;
}

export function SignupPage() {
  const { t } = useTranslation();
  const { user, signUp, configured, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/account", { replace: true });
  }, [user, loading, navigate]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setSubmitting(true);
    const { error: err, needsEmailConfirmation } = await signUp(
      email.trim(),
      password,
      fullName.trim()
    );
    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }

    if (needsEmailConfirmation) {
      setSuccess(t("auth.checkEmail"));
      return;
    }

    navigate("/account", { replace: true });
  };

  return (
    <AuthShell
      mode="signup"
      footer={
        <p>
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="auth-shell-link">
            {t("auth.signIn")}
          </Link>
        </p>
      }
    >
      <div className="auth-shell-header">
        <h1 className="auth-shell-title">{t("auth.signupTitle")}</h1>
        <p className="auth-shell-subtitle">{t("auth.signupSubtitle")}</p>
      </div>

      {!configured && <p className="auth-shell-alert">{t("auth.notConfigured")}</p>}

      <form onSubmit={handleSubmit} className="auth-shell-form">
        <div className="form-field">
          <label htmlFor="signup-name" className="form-label">
            {t("auth.fullName")}
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="form-input"
            placeholder={t("auth.fullNamePlaceholder")}
          />
        </div>

        <div className="form-field">
          <label htmlFor="signup-email" className="form-label">
            {t("auth.email")}
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="you@example.com"
          />
        </div>

        <PasswordField
          id="signup-password"
          label={t("auth.password")}
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t("auth.passwordHint")}
        />

        {password.length > 0 ? (
          <div className="auth-strength" aria-hidden>
            <div className="auth-strength-track">
              <span className={`auth-strength-bar auth-strength-bar--${strength}`} />
            </div>
            <p className="auth-field-hint">
              {strength === 0
                ? t("auth.passwordTooShort")
                : strength === 1
                  ? t("auth.passwordStrengthFair")
                  : strength === 2
                    ? t("auth.passwordStrengthGood")
                    : t("auth.passwordStrengthStrong")}
            </p>
          </div>
        ) : null}

        <PasswordField
          id="signup-confirm"
          label={t("auth.confirmPassword")}
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          hint={
            passwordsMatch ? (
              <span className="auth-field-hint--success">{t("auth.passwordsMatch")}</span>
            ) : undefined
          }
        />

        {error ? (
          <p className="auth-shell-error" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="auth-shell-success" role="status">
            {success}
          </p>
        ) : null}

        <AuthSubmitButton loading={submitting} disabled={!configured}>
          {submitting ? t("auth.signingUp") : t("auth.signUp")}
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}

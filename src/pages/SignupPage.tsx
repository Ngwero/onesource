import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

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
      footer={
        <p>
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="auth-shell-link">
            {t("auth.signIn")}
          </Link>
        </p>
      }
    >
      <h1 className="auth-shell-title">{t("auth.signupTitle")}</h1>
      <p className="auth-shell-subtitle">{t("auth.signupSubtitle")}</p>

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
          />
        </div>
        <div className="form-field">
          <label htmlFor="signup-password" className="form-label">
            {t("auth.password")}
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-field">
          <label htmlFor="signup-confirm" className="form-label">
            {t("auth.confirmPassword")}
          </label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
          />
        </div>

        {error && <p className="auth-shell-error">{error}</p>}
        {success && <p className="auth-shell-success">{success}</p>}

        <button
          type="submit"
          disabled={submitting || !configured}
          className="btn-primary w-full min-h-[48px] disabled:opacity-50"
        >
          {submitting ? t("auth.signingUp") : t("auth.signUp")}
        </button>
      </form>
    </AuthShell>
  );
}

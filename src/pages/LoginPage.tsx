import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { t } = useTranslation();
  const { user, signIn, configured, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/account";

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <AuthShell
      footer={
        <p>
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="auth-shell-link">
            {t("auth.createAccount")}
          </Link>
        </p>
      }
    >
      <h1 className="auth-shell-title">{t("auth.loginTitle")}</h1>
      <p className="auth-shell-subtitle">{t("auth.loginSubtitle")}</p>

      {!configured && (
        <p className="auth-shell-alert">{t("auth.notConfigured")}</p>
      )}

      <form onSubmit={handleSubmit} className="auth-shell-form">
        <div className="form-field">
          <label htmlFor="login-email" className="form-label">
            {t("auth.email")}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-field">
          <div className="form-label-row">
            <label htmlFor="login-password" className="form-label">
              {t("auth.password")}
            </label>
            <Link to="/forgot-password" className="form-link">
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
        </div>

        {error && <p className="auth-shell-error">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !configured}
          className="btn-primary w-full min-h-[48px] disabled:opacity-50"
        >
          {submitting ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>
    </AuthShell>
  );
}

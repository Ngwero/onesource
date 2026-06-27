import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { user, requestPasswordReset, configured, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/account", { replace: true });
  }, [user, loading, navigate]);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    const { error: err } = await requestPasswordReset(email.trim());
    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(t("auth.resetEmailSent"));
  };

  return (
    <AuthShell
      footer={
        <Link to="/login" className="auth-shell-link">
          {t("auth.backToSignIn")}
        </Link>
      }
    >
      <h1 className="auth-shell-title">{t("auth.forgotPasswordTitle")}</h1>
      <p className="auth-shell-subtitle">{t("auth.forgotPasswordSubtitle")}</p>

      {!configured && <p className="auth-shell-alert">{t("auth.notConfigured")}</p>}

      <form onSubmit={handleSubmit} className="auth-shell-form">
        <div className="form-field">
          <label htmlFor="forgot-email" className="form-label">
            {t("auth.email")}
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
          />
        </div>

        {error && <p className="auth-shell-error">{error}</p>}
        {success && <p className="auth-shell-success">{success}</p>}

        <button
          type="submit"
          disabled={submitting || !configured || Boolean(success)}
          className="btn-primary w-full min-h-[48px] disabled:opacity-50"
        >
          {submitting ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
        </button>
      </form>
    </AuthShell>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { updatePassword, configured, loading, passwordRecovery } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = window.setTimeout(() => navigate("/login", { replace: true }), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [success, navigate]);

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
    const { error: err } = await updatePassword(password);
    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(t("auth.passwordUpdated"));
  };

  const showForm = !loading && passwordRecovery;

  return (
    <AuthShell>
      <h1 className="auth-shell-title">{t("auth.resetPasswordTitle")}</h1>
      <p className="auth-shell-subtitle">{t("auth.resetPasswordSubtitle")}</p>

      {!configured && <p className="auth-shell-alert">{t("auth.notConfigured")}</p>}

      {loading && (
        <p className="auth-shell-subtitle mt-4">{t("auth.verifyingResetLink")}</p>
      )}

      {!loading && !passwordRecovery && (
        <div className="auth-shell-form">
          <p className="auth-shell-error">{t("auth.resetLinkInvalid")}</p>
          <Link to="/forgot-password" className="auth-shell-link block text-center">
            {t("auth.forgotPassword")}
          </Link>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="auth-shell-form">
          <div className="form-field">
            <label htmlFor="reset-password" className="form-label">
              {t("auth.newPassword")}
            </label>
            <input
              id="reset-password"
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
            <label htmlFor="reset-confirm-password" className="form-label">
              {t("auth.confirmPassword")}
            </label>
            <input
              id="reset-confirm-password"
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
            disabled={submitting || !configured || Boolean(success)}
            className="btn-primary w-full min-h-[48px] disabled:opacity-50"
          >
            {submitting ? t("auth.updatingPassword") : t("auth.updatePassword")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

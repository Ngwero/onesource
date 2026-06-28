import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { isPasswordRecoveryCallback } from "../lib/authRecovery";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { updatePassword, configured, loading, passwordRecovery } = useAuth();
  const navigate = useNavigate();
  const recoveryCallback = isPasswordRecoveryCallback();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!completed) return;
    const timer = window.setTimeout(() => navigate("/login", { replace: true }), 2500);
    return () => window.clearTimeout(timer);
  }, [completed, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

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

    setCompleted(true);
  };

  const canReset = passwordRecovery || recoveryCallback;
  const showInvalidLink = !loading && !completed && !canReset;
  const showForm = !loading && !completed && canReset;

  return (
    <AuthShell>
      <h1 className="auth-shell-title">{t("auth.resetPasswordTitle")}</h1>
      <p className="auth-shell-subtitle">{t("auth.resetPasswordSubtitle")}</p>

      {!configured && <p className="auth-shell-alert">{t("auth.notConfigured")}</p>}

      {loading && (
        <p className="auth-shell-subtitle mt-4">{t("auth.verifyingResetLink")}</p>
      )}

      {showInvalidLink && (
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

          <button
            type="submit"
            disabled={submitting || !configured}
            className="btn-primary w-full min-h-[48px] disabled:opacity-50"
          >
            {submitting ? t("auth.updatingPassword") : t("auth.updatePassword")}
          </button>
        </form>
      )}

      {completed && (
        <div className="auth-shell-form">
          <p className="auth-shell-success">{t("auth.passwordUpdated")}</p>
          <Link to="/login" className="auth-shell-link block text-center mt-4">
            {t("auth.backToSignIn")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}

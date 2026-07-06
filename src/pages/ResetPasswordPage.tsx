import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../components/AuthShell";
import { AuthSubmitButton } from "../components/auth/AuthSubmitButton";
import { PasswordField } from "../components/auth/PasswordField";
import { PasswordStrengthMeter } from "../components/auth/PasswordStrengthMeter";
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

  const passwordsMatch = useMemo(
    () => confirmPassword.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  );

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
    <AuthShell mode="login">
      <div className="auth-shell-header">
        <h1 className="auth-shell-title">{t("auth.resetPasswordTitle")}</h1>
        <p className="auth-shell-subtitle">{t("auth.resetPasswordSubtitle")}</p>
      </div>

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
          <PasswordField
            id="reset-password"
            label={t("auth.newPassword")}
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={t("auth.passwordHint")}
          />

          <PasswordStrengthMeter password={password} />

          <PasswordField
            id="reset-confirm-password"
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

          <AuthSubmitButton loading={submitting} disabled={!configured}>
            {submitting ? t("auth.updatingPassword") : t("auth.updatePassword")}
          </AuthSubmitButton>
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

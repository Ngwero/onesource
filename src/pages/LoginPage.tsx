import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "../components/AuthShell";
import { AuthStepIndicator } from "../components/auth/AuthStepIndicator";
import { AuthSubmitButton } from "../components/auth/AuthSubmitButton";
import { PasswordField } from "../components/auth/PasswordField";
import { useAuth } from "../context/AuthContext";

type Step = "credentials" | "otp";

export function LoginPage() {
  const { t } = useTranslation();
  const { user, signIn, verifyLoginOtp, configured, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/account";

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err, requiresOtp } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    if (requiresOtp) {
      setStep("otp");
      return;
    }
    navigate(from, { replace: true });
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await verifyLoginOtp(email.trim(), otp.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <AuthShell
      mode="login"
      footer={
        <p>
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="auth-shell-link">
            {t("auth.createAccount")}
          </Link>
        </p>
      }
    >
      <AuthStepIndicator step={step} />

      <div className="auth-shell-header">
        <h1 className="auth-shell-title">
          {step === "otp" ? t("auth.otpTitle") : t("auth.loginTitle")}
        </h1>
        <p className="auth-shell-subtitle">
          {step === "otp" ? t("auth.otpSubtitle", { email }) : t("auth.loginSubtitle")}
        </p>
      </div>

      {step === "otp" ? (
        <p className="auth-email-chip" title={email}>
          {email}
        </p>
      ) : null}

      {!configured && <p className="auth-shell-alert">{t("auth.notConfigured")}</p>}

      {step === "credentials" ? (
        <form onSubmit={handleCredentialsSubmit} className="auth-shell-form">
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
              placeholder="you@example.com"
            />
          </div>

          <PasswordField
            id="login-password"
            label={t("auth.password")}
            labelExtra={
              <Link to="/forgot-password" className="form-link">
                {t("auth.forgotPassword")}
              </Link>
            }
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error ? (
            <p className="auth-shell-error" role="alert">
              {error}
            </p>
          ) : null}

          <AuthSubmitButton loading={submitting} disabled={!configured}>
            {submitting ? t("auth.signingIn") : t("auth.signIn")}
          </AuthSubmitButton>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="auth-shell-form">
          <div className="form-field">
            <label htmlFor="login-otp" className="form-label">
              {t("auth.otpLabel")}
            </label>
            <div className="auth-otp-box">
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6,8}"
                maxLength={8}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="form-input auth-otp-input"
                placeholder="000000"
                autoFocus
              />
            </div>
            <p className="auth-field-hint">{t("auth.otpHint")}</p>
          </div>

          {error ? (
            <p className="auth-shell-error" role="alert">
              {error}
            </p>
          ) : null}

          <AuthSubmitButton loading={submitting} disabled={otp.length < 6}>
            {submitting ? t("auth.verifyingOtp") : t("auth.verifyOtp")}
          </AuthSubmitButton>

          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setOtp("");
              setError(null);
            }}
            className="auth-text-btn"
          >
            {t("auth.backToSignIn")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

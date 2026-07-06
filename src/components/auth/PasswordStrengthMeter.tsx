import { useTranslation } from "react-i18next";
import { passwordStrengthLabel, scorePassword } from "../../lib/passwordStrength";

type Props = {
  password: string;
};

const LABEL_KEYS = {
  tooShort: "auth.passwordTooShort",
  weak: "auth.passwordStrengthWeak",
  fair: "auth.passwordStrengthFair",
  good: "auth.passwordStrengthGood",
  strong: "auth.passwordStrengthStrong",
} as const;

export function PasswordStrengthMeter({ password }: Props) {
  const { t } = useTranslation();
  if (!password) return null;

  const strength = scorePassword(password);
  const labelKey = LABEL_KEYS[passwordStrengthLabel(strength)];
  const barClass = strength === 0 ? 1 : strength;

  return (
    <div className="auth-strength" aria-live="polite">
      <div className="auth-strength-track" aria-hidden>
        <span className={`auth-strength-bar auth-strength-bar--${barClass}`} />
      </div>
      <p className="auth-field-hint">{t(labelKey)}</p>
    </div>
  );
}

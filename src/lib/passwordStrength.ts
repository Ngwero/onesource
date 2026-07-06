export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export type PasswordStrengthLabel =
  | "tooShort"
  | "weak"
  | "fair"
  | "good"
  | "strong";

export function scorePassword(password: string): PasswordStrength {
  if (!password) return 0;
  if (password.length < 6) return 0;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return 1;
  if (score === 2) return 2;
  if (score === 3) return 3;
  return 4;
}

export function passwordStrengthLabel(strength: PasswordStrength): PasswordStrengthLabel {
  if (strength === 0) return "tooShort";
  if (strength === 1) return "weak";
  if (strength === 2) return "fair";
  if (strength === 3) return "good";
  return "strong";
}

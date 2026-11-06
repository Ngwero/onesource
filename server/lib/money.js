/**
 * Money helpers: catalogue and order amounts are integers in the currency's
 * minor units (UGX/RWF/CDF: whole francs/shillings; GBP/USD/KES: cents/pence).
 * Formatting for display happens only in the UI.
 */

export const BASE_CURRENCY = "UGX";

/** Fraction digits → minor-unit scale. */
export const CURRENCY_DECIMALS = Object.freeze({
  UGX: 0,
  RWF: 0,
  CDF: 0,
  GBP: 2,
  USD: 2,
  KES: 2,
});

export function currencyDecimals(code) {
  const key = String(code || BASE_CURRENCY).toUpperCase();
  return CURRENCY_DECIMALS[key] ?? 0;
}

/** Convert a major-unit number into an integer minor-unit amount. */
export function toMinorUnits(amount, currency = BASE_CURRENCY) {
  const decimals = currencyDecimals(currency);
  const n = Number(amount);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 10 ** decimals);
}

/** Convert integer minor units back to a major-unit number for display APIs. */
export function fromMinorUnits(minor, currency = BASE_CURRENCY) {
  const decimals = currencyDecimals(currency);
  const n = Number(minor);
  if (!Number.isFinite(n)) return NaN;
  return n / 10 ** decimals;
}

/** Ensure a catalogue/order amount is a safe non-negative integer (UGX minor). */
export function asMoneyInteger(amount) {
  const n = Math.round(Number(amount));
  if (!Number.isSafeInteger(n) || n < 0) return null;
  return n;
}

/**
 * Convert a UGX minor-unit amount into another currency's minor units using a
 * major-unit FX rate (UGX → target). Rounds to the target's minor unit.
 */
export function convertUgxMinorTo(ugxMinor, targetCurrency, rateFromUgx) {
  const rate = Number(rateFromUgx);
  if (!Number.isFinite(rate) || rate < 0) return null;
  const major = Number(ugxMinor) * rate;
  return toMinorUnits(major, targetCurrency);
}

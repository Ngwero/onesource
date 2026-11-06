import type { CurrencyCode } from "./currencies";
import { getCurrencyInfo } from "./currencies";

/** Catalogue / order amounts are UGX whole shillings (minor = major). */
export const BASE_CURRENCY_CODE: CurrencyCode = "UGX";

/**
 * Convert a UGX integer amount into the selected currency's minor units, then
 * to a major-unit number suitable for Intl formatting.
 */
export function convertUgxToDisplayMajor(
  amountUgx: number,
  currency: CurrencyCode,
  rateFromUgx: number
): number {
  const info = getCurrencyInfo(currency);
  const ugx = Math.round(Number(amountUgx));
  if (!Number.isFinite(ugx) || ugx <= 0) return 0;
  const rate = Number(rateFromUgx);
  if (!Number.isFinite(rate) || rate < 0) return 0;
  const scale = 10 ** info.decimals;
  const minor = Math.round(ugx * rate * scale);
  // Tiny positive converted amounts still show as one minor unit.
  if (ugx > 0 && minor === 0 && rate > 0) return 1 / scale;
  return minor / scale;
}

export function asUgxInteger(amount: number): number | null {
  const n = Math.round(Number(amount));
  if (!Number.isSafeInteger(n) || n < 0) return null;
  return n;
}

/**
 * Euro pharmacy sticker → Kampala shelf price (UGX).
 *
 * The source catalogue is priced in EUR. UGX per EUR follows the cosmetics
 * yardstick (4750 UGX per GBP, and 1 GBP ≈ 1.16 EUR), so 4750 / 1.16 ≈ 4100.
 * Margin tapers from 1.12 on small packs to 1.06 on expensive devices.
 * Never below the EUR sticker × FX × 1.05.
 */
export const PHARMACY_UGX_PER_EUR = 4100;
export const PHARMACY_MARGIN_LOW = 1.12;
export const PHARMACY_MARGIN_HIGH = 1.06;
export const PHARMACY_FLOOR_MARGIN = 1.05;

export function roundPharmacyUgx(amount) {
  const n = Number(amount) || 0;
  if (n < 20000) return Math.max(500, Math.round(n / 500) * 500);
  if (n < 100000) return Math.max(500, Math.round(n / 1000) * 1000);
  return Math.max(500, Math.round(n / 5000) * 5000);
}

function roundUp(amount) {
  const step = amount < 20000 ? 500 : amount < 100000 ? 1000 : 5000;
  return Math.max(500, Math.ceil(amount / step) * step);
}

function marginFor(eur) {
  const t = Math.min(1, Math.max(0, (eur - 8) / 80));
  return PHARMACY_MARGIN_LOW + (PHARMACY_MARGIN_HIGH - PHARMACY_MARGIN_LOW) * t;
}

/**
 * @param {number} eur Current supplier sticker (EUR)
 * @returns {{ price: number, floor: number } | null}
 */
export function pharmacyShelfPrice(eur) {
  const n = Number(eur);
  if (!Number.isFinite(n) || n <= 0) return null;
  const landed = n * PHARMACY_UGX_PER_EUR;
  const floor = roundUp(landed * PHARMACY_FLOOR_MARGIN);
  const price = Math.max(roundPharmacyUgx(landed * marginFor(n)), floor);
  return { price, floor };
}

/** Was-price keeps the supplier's real regular/sale ratio. */
export function pharmacyWasPrice(price, eur, regularEur) {
  if (!(regularEur > eur * 1.02)) return null;
  const was = roundPharmacyUgx(price * (regularEur / eur));
  return was > price ? was : null;
}

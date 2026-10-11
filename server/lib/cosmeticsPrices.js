/**
 * UK beauty sticker (GBP) → competitive Kampala shelf price (UGX).
 *
 * Benchmarks (Oct 2026): MAC lipstick UGX 110–125k at Beauty Trends UG and
 * 192k on Jumia; Fenty Pro Filt'r 32ml UGX 194k (fentybeauty.com/en-ug);
 * Clinique Moisture Surge 50ml UGX 295k on Jumia; Estée Lauder ANR 50ml
 * ≈ UGX 585k in Nairobi. That is roughly UGX 4,600–6,600 per £1 of UK
 * price, rising with the price point. Jumia UG sale prices (Clinique ~40% off
 * list) and SweetCare UG (Kiehl's Ultra Facial Cream 50ml $36 ≈ UGX 135k vs
 * £34 UK) sit near UGX 4,000–4,800 per £1. UK stickers include 20% VAT that
 * exports reclaim, so the rate below undercuts those while covering cost.
 */
export const COSMETICS_UGX_PER_GBP_MIN = 4500;
export const COSMETICS_UGX_PER_GBP_MAX = 5000;

export function gbpToUgandanCosmeticsPrice(gbp) {
  const n = Number(gbp);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rate =
    COSMETICS_UGX_PER_GBP_MIN +
    (COSMETICS_UGX_PER_GBP_MAX - COSMETICS_UGX_PER_GBP_MIN) * Math.min(1, n / 100);
  return Math.max(500, Math.round((n * rate) / 500) * 500);
}

/** Minimum native resolution for pharmacy cards and their detail views. */
export function isHighQualityPharmacyImage({ width = 0, height = 0 } = {}) {
  return Math.max(width, height) >= 800 && Math.min(width, height) >= 400;
}

/** Top-level PharmaMarket category → pharmacy aisle id. */
const TOP_TO_AISLE = {
  Medicines: "medicines",
  "Supplements & vitamins": "supplements",
  "First aid & homecare": "first-aid",
  "Care & hygiene": "care",
  Orthopedics: "orthopedics",
  "Well-being & health": "wellbeing",
  "Mother & child": "mother-child",
  Animals: "animals",
  Food: "nutrition",
  Naturopathy: "naturopathy",
  "Weight loss & sports": "sports",
  Promotions: "offers",
  "Gift ideas": "offers",
  "Last chance": "offers",
  "Hoofdcategorie Migrated": "offers",
};

export const PHARMACY_AISLE_IDS = [
  "medicines",
  "supplements",
  "first-aid",
  "care",
  "orthopedics",
  "wellbeing",
  "mother-child",
  "animals",
  "nutrition",
  "naturopathy",
  "sports",
  "offers",
];

export function pharmacyAisleForCategory(category) {
  const top = String(category ?? "").split("/")[0].trim();
  return TOP_TO_AISLE[top] ?? "offers";
}

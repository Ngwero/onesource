/** Pharmacy aisle definitions — keep ids in sync with server/lib/aisles.js */
export const PHARMACY_CATEGORY_ID = "pharmacy";

export const PHARMACY_AISLES = [
  { id: "medicines", title: "Medicines", icon: "💊" },
  { id: "supplements", title: "Supplements & vitamins", icon: "🧴" },
  { id: "first-aid", title: "First aid & home care", icon: "🩹" },
  { id: "care", title: "Care & hygiene", icon: "🧼" },
  { id: "orthopedics", title: "Orthopedics", icon: "🦵" },
  { id: "wellbeing", title: "Well-being", icon: "🌿" },
  { id: "mother-child", title: "Mother & child", icon: "👶" },
  { id: "animals", title: "Pet health", icon: "🐾" },
  { id: "nutrition", title: "Medical nutrition", icon: "🥛" },
  { id: "naturopathy", title: "Naturopathy", icon: "🌱" },
  { id: "sports", title: "Sports & weight", icon: "🏃" },
  { id: "offers", title: "Offers & gifts", icon: "🎁" },
] as const;

export type PharmacyAisleId = (typeof PHARMACY_AISLES)[number]["id"];

export function pharmacyAisleIdFromProductId(productId: string): PharmacyAisleId | null {
  const match = PHARMACY_AISLES.find((aisle) => productId.startsWith(`pharmacy-${aisle.id}-`));
  return match?.id ?? null;
}

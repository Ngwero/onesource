/** Cosmetics aisle definitions — keep ids in sync with server/scripts/import-*-cosmetics.js */
export const COSMETICS_CATEGORY_ID = "cosmetics";

export const COSMETICS_AISLES = [
  { id: "face-makeup", title: "Face makeup", icon: "💄" },
  { id: "eye-makeup", title: "Eye makeup", icon: "👁️" },
  { id: "lips", title: "Lips", icon: "💋" },
  { id: "face-eye-care", title: "Face & eye care", icon: "🧖" },
  { id: "serums-oils", title: "Serums & oils", icon: "💧" },
  { id: "cleansers-bars", title: "Cleansers & bars", icon: "🧼" },
  { id: "sun-protection", title: "Sun protection", icon: "☀️" },
  { id: "acne-care", title: "Acne care", icon: "✨" },
  { id: "body-care", title: "Body care", icon: "🧴" },
  { id: "hair-baby-more", title: "Hair, fragrance & more", icon: "🌸" },
  { id: "kits-bundles", title: "Kits & gift sets", icon: "🎁" },
  { id: "brushes-tools", title: "Brushes & tools", icon: "🖌️" },
] as const;

export type CosmeticsAisleId = (typeof COSMETICS_AISLES)[number]["id"];

export function cosmeticsAisleIdFromProductId(productId: string): CosmeticsAisleId | null {
  const match = COSMETICS_AISLES.find((aisle) =>
    productId.startsWith(`cosmetics-${aisle.id}-`)
  );
  return match?.id ?? null;
}

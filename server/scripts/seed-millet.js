/**
 * Seed 14 millet products into `cereals-and-grains`.
 *
 * Usage:
 *   cd server && npm run seed:millet
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const MILLET_CATEGORY_ID = "cereals-and-grains";

const MILLET_PRODUCTS = [
  { id: "millet-seed-01", name: "Millet – Pearl" },
  { id: "millet-seed-02", name: "Millet – Finger" },
  { id: "millet-seed-03", name: "Millet – Organic" },
  { id: "millet-seed-04", name: "Millet – Whole grain" },
  { id: "millet-seed-05", name: "Millet – Hulled" },
  { id: "millet-seed-06", name: "Millet – Small pack" },
  { id: "millet-seed-07", name: "Millet – Bulk sack" },
  { id: "millet-seed-08", name: "Millet – Porridge grade" },
  { id: "millet-seed-09", name: "Millet – Local farm" },
  { id: "millet-seed-10", name: "Millet – Export grade" },
  { id: "millet-seed-11", name: "Millet – Premium" },
  { id: "millet-seed-12", name: "Millet – Red variety" },
  { id: "millet-seed-13", name: "Millet – Flour" },
  { id: "millet-seed-14", name: "Millet – Cooking mix" },
];

function randomPrice(i) {
  const base = 5200 + i * 220;
  return Math.round((base + Math.floor(Math.random() * 850)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 6) return "per 25kg";
  if (i === 5 || i === 12) return "per 500g";
  if (i === 13) return "per 2kg";
  return "per kg";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < MILLET_PRODUCTS.length; i++) {
    const item = MILLET_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 4 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.15) : undefined,
        rating: Number((4.0 + Math.random() * 0.9).toFixed(1)),
        reviewCount: Math.floor(70 + Math.random() * 1100),
        image,
        category: MILLET_CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${item.name}. Nutritious millet for porridge, ugali, and baking. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 30 + Math.floor(Math.random() * 140),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed millet failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} millet products (${MILLET_CATEGORY_ID}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

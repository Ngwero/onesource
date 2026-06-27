/**
 * Seed 10 lentil products into `legumes-and-pulses`.
 *
 * Usage:
 *   cd server && npm run seed:lentils
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const LENTILS_CATEGORY_ID = "legumes-and-pulses";

const LENTILS_PRODUCTS = [
  { id: "lentils-seed-01", name: "Lentils – Green" },
  { id: "lentils-seed-02", name: "Lentils – Red" },
  { id: "lentils-seed-03", name: "Lentils – Brown" },
  { id: "lentils-seed-04", name: "Lentils – Organic" },
  { id: "lentils-seed-05", name: "Lentils – Small pack" },
  { id: "lentils-seed-06", name: "Lentils – Bulk sack" },
  { id: "lentils-seed-07", name: "Lentils – Cooking mix" },
  { id: "lentils-seed-08", name: "Lentils – Export grade" },
  { id: "lentils-seed-09", name: "Lentils – Premium" },
  { id: "lentils-seed-10", name: "Lentils – Local farm" },
];

function randomPrice(i) {
  const base = 6800 + i * 260;
  return Math.round((base + Math.floor(Math.random() * 900)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per 25kg";
  if (i === 4) return "per 500g";
  return "per kg";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < LENTILS_PRODUCTS.length; i++) {
    const item = LENTILS_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 4 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.18) : undefined,
        rating: Number((4.1 + Math.random() * 0.9).toFixed(1)),
        reviewCount: Math.floor(60 + Math.random() * 1200),
        image,
        category: LENTILS_CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${item.name}. Lentils for soups, stews, and nutritious meals. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 25 + Math.floor(Math.random() * 160),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed lentils failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} lentil products (${LENTILS_CATEGORY_ID}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


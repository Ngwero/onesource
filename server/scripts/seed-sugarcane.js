/**
 * Seed 10 sugarcane products into `fresh-fruits`.
 *
 * Usage:
 *   cd server && npm run seed:sugarcane
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const SUGARCANE_CATEGORY_ID = "fresh-fruits";

const SUGARCANE_PRODUCTS = [
  { id: "sugarcane-seed-01", name: "Sugarcane – Fresh stalks" },
  { id: "sugarcane-seed-02", name: "Sugarcane – Peeled sticks" },
  { id: "sugarcane-seed-03", name: "Sugarcane – Organic" },
  { id: "sugarcane-seed-04", name: "Sugarcane – Sweet variety" },
  { id: "sugarcane-seed-05", name: "Sugarcane – Farm fresh" },
  { id: "sugarcane-seed-06", name: "Sugarcane – Bulk bundle" },
  { id: "sugarcane-seed-07", name: "Sugarcane – Local farm" },
  { id: "sugarcane-seed-08", name: "Sugarcane – Export grade" },
  { id: "sugarcane-seed-09", name: "Sugarcane – Premium" },
  { id: "sugarcane-seed-10", name: "Sugarcane – Juicing stalks" },
];

function randomPrice(i) {
  const base = 3200 + i * 280;
  return Math.round((base + Math.floor(Math.random() * 700)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per 10 stalks";
  if (i === 1) return "per 5 sticks";
  if (i === 9) return "per kg";
  return "per stalk";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < SUGARCANE_PRODUCTS.length; i++) {
    const item = SUGARCANE_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 4 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.16) : undefined,
        rating: Number((4.2 + Math.random() * 0.8).toFixed(1)),
        reviewCount: Math.floor(60 + Math.random() * 850),
        image,
        category: SUGARCANE_CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.4,
        description: `${item.name}. Fresh sugarcane for chewing or juicing. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 50 + Math.floor(Math.random() * 150),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed sugarcane failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} sugarcane products (${SUGARCANE_CATEGORY_ID}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

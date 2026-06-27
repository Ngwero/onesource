/**
 * Seed 10 butter products into `dairy-products`.
 *
 * Usage:
 *   cd server && npm run seed:butter
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const BUTTER_CATEGORY_ID = "dairy-products";

const BUTTER_PRODUCTS = [
  { id: "butter-seed-01", name: "Butter – Salted" },
  { id: "butter-seed-02", name: "Butter – Unsalted" },
  { id: "butter-seed-03", name: "Butter – Spreadable" },
  { id: "butter-seed-04", name: "Butter – Organic" },
  { id: "butter-seed-05", name: "Butter – Farm churned" },
  { id: "butter-seed-06", name: "Butter – Bulk block" },
  { id: "butter-seed-07", name: "Butter – Local dairy" },
  { id: "butter-seed-08", name: "Butter – Export grade" },
  { id: "butter-seed-09", name: "Butter – Premium" },
  { id: "butter-seed-10", name: "Butter – Ghee style" },
];

function randomPrice(i) {
  const base = 12000 + i * 400;
  return Math.round((base + Math.floor(Math.random() * 1200)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per 5kg";
  if (i === 9) return "per 500g";
  return "per 250g";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < BUTTER_PRODUCTS.length; i++) {
    const item = BUTTER_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 3 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.15) : undefined,
        rating: Number((4.4 + Math.random() * 0.6).toFixed(1)),
        reviewCount: Math.floor(100 + Math.random() * 900),
        image,
        category: BUTTER_CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.3,
        description: `${item.name}. Fresh dairy butter for cooking and baking. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 20 + Math.floor(Math.random() * 80),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed butter failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} butter products (${BUTTER_CATEGORY_ID}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

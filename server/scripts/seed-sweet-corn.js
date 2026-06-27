/**
 * Seed 10 sweet corn products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:sweet-corn
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const SWEET_CORN_CATEGORY_ID = "fresh-vegetables";

const SWEET_CORN_PRODUCTS = [
  { id: "sweet-corn-seed-01", name: "Sweetcorn – 2 cobs" },
  { id: "sweet-corn-seed-02", name: "Sweet Corn – Fresh cobs" },
  { id: "sweet-corn-seed-03", name: "Sweet Corn – Baby corn" },
  { id: "sweet-corn-seed-04", name: "Sweet Corn – Organic" },
  { id: "sweet-corn-seed-05", name: "Sweet Corn – Yellow" },
  { id: "sweet-corn-seed-06", name: "Sweet Corn – Bulk pack" },
  { id: "sweet-corn-seed-07", name: "Sweet Corn – Farm fresh" },
  { id: "sweet-corn-seed-08", name: "Sweet Corn – Export grade" },
  { id: "sweet-corn-seed-09", name: "Sweet Corn – Premium" },
  { id: "sweet-corn-seed-10", name: "Sweet Corn – Local farm" },
];

function randomPrice(i) {
  const base = 4500 + i * 300;
  return Math.round((base + Math.floor(Math.random() * 800)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per 6 pack";
  if (i === 2) return "per 500g";
  return "per 2 cobs";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < SWEET_CORN_PRODUCTS.length; i++) {
    const item = SWEET_CORN_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 3 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.18) : undefined,
        rating: Number((4.3 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(90 + Math.random() * 1000),
        image,
        category: SWEET_CORN_CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${item.name}. Sweet, tender corn for grilling, boiling, or salads. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 40 + Math.floor(Math.random() * 120),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed sweet corn failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} sweet corn products (${SWEET_CORN_CATEGORY_ID}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

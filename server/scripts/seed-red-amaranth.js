/**
 * Seed 12 red amaranth (bugga) products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:red-amaranth
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-vegetables";
const PRODUCT_NAME = "Red Amaranth (Bugga)";

const RED_AMARANTH_PRODUCTS = [
  { id: "red-amaranth-seed-01", name: "Hand-picked bunch" },
  { id: "red-amaranth-seed-02", name: "Family pack 500g" },
  { id: "red-amaranth-seed-03", name: "Young tender leaves" },
  { id: "red-amaranth-seed-04", name: "Organic" },
  { id: "red-amaranth-seed-05", name: "Baby leaves" },
  { id: "red-amaranth-seed-06", name: "Bulk 1kg" },
  { id: "red-amaranth-seed-07", name: "Farm fresh" },
  { id: "red-amaranth-seed-08", name: "Stew ready" },
  { id: "red-amaranth-seed-09", name: "Washed & trimmed" },
  { id: "red-amaranth-seed-10", name: "Morning harvest" },
  { id: "red-amaranth-seed-11", name: "Local farm" },
  { id: "red-amaranth-seed-12", name: "One Source pick" },
];

function randomPrice(i) {
  const base = 2600 + i * 200;
  return Math.round((base + Math.floor(Math.random() * 450)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per kg";
  if (i === 1 || i === 8) return "per 500g";
  if (i === 0) return "per bunch";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < RED_AMARANTH_PRODUCTS.length; i++) {
    const item = RED_AMARANTH_PRODUCTS[i];
    const title = `${PRODUCT_NAME} – ${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 3 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.14) : undefined,
        rating: Number((4.2 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(35 + Math.random() * 850),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${PRODUCT_NAME} — ${item.name}. Fresh red amaranth leaves (bugga / dodo) — steam, stew with groundnut sauce, or sauté with onions and tomatoes. A popular Ugandan leafy green. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 30 + Math.floor(Math.random() * 120),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed red amaranth failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} red amaranth (bugga) products (${CATEGORY_ID}).`);
  console.log("Search: red amaranth, bugga, dodo, amaranth");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

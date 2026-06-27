/**
 * Seed 10 fresh malakwang products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:malakwang
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-vegetables";
const PRODUCT_NAME = "Fresh Malakwang";

const MALAKWANG_PRODUCTS = [
  { id: "malakwang-seed-01", name: "Hand-picked bunch" },
  { id: "malakwang-seed-02", name: "Family pack 500g" },
  { id: "malakwang-seed-03", name: "Young tender leaves" },
  { id: "malakwang-seed-04", name: "Organic" },
  { id: "malakwang-seed-05", name: "Farm fresh" },
  { id: "malakwang-seed-06", name: "Stew ready" },
  { id: "malakwang-seed-07", name: "Washed & trimmed" },
  { id: "malakwang-seed-08", name: "Morning harvest" },
  { id: "malakwang-seed-09", name: "Local farm" },
  { id: "malakwang-seed-10", name: "One Source pick" },
];

function randomPrice(i) {
  const base = 3000 + i * 220;
  return Math.round((base + Math.floor(Math.random() * 500)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 1 || i === 6) return "per 500g";
  if (i === 0) return "per bunch";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < MALAKWANG_PRODUCTS.length; i++) {
    const item = MALAKWANG_PRODUCTS[i];
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
        reviewCount: Math.floor(30 + Math.random() * 800),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${PRODUCT_NAME} — ${item.name}. Fresh malakwang leaves — boil and pound with groundnut or simsim paste for a classic Acholi and Ugandan stew. Slightly tangy, nutritious leafy green. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 30 + Math.floor(Math.random() * 110),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed malakwang failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} malakwang products (${CATEGORY_ID}).`);
  console.log("Search: malakwang, malakwang leaves");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

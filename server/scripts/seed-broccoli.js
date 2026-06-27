/**
 * Seed 10 fresh broccoli products into `fresh-vegetables`.
 *
 * This is a simple “add more SKUs” script intended for dev/demo.
 *
 * Usage:
 *   cd server && npm run seed:broccoli
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const BROCCOLI_CATEGORY_ID = "fresh-vegetables";

const BROCCOLI_PRODUCTS = [
  { id: "broccoli-seed-01", name: "Fresh Broccoli – Large head" },
  { id: "broccoli-seed-02", name: "Fresh Broccoli – Medium head" },
  { id: "broccoli-seed-03", name: "Fresh Broccoli – Tender florets" },
  { id: "broccoli-seed-04", name: "Fresh Broccoli – Organic" },
  { id: "broccoli-seed-05", name: "Fresh Broccoli – Baby broccoli" },
  { id: "broccoli-seed-06", name: "Fresh Broccoli – Bulk" },
  { id: "broccoli-seed-07", name: "Broccoli – Ready to steam" },
  { id: "broccoli-seed-08", name: "Broccoli – Export grade" },
  { id: "broccoli-seed-09", name: "Broccoli – Green, Grade A" },
  { id: "broccoli-seed-10", name: "Broccoli – Local farm" },
];

function randomPrice(i) {
  // Keep prices close to the existing broccoli template while still varying.
  const base = 4200 + i * 320;
  return Math.round((base + Math.floor(Math.random() * 600)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < BROCCOLI_PRODUCTS.length; i++) {
    const item = BROCCOLI_PRODUCTS[i];
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
        rating: Number((4.2 + Math.random() * 0.8).toFixed(1)),
        reviewCount: Math.floor(80 + Math.random() * 1200),
        image,
        category: BROCCOLI_CATEGORY_ID,
        unit: "each",
        prime: Math.random() > 0.35,
        description: `Fresh broccoli for a healthy side dish. ${item.name}. Steam, roast, or stir-fry. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 30 + Math.floor(Math.random() * 140),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed broccoli failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} broccoli products (${BROCCOLI_CATEGORY_ID}).`);
  console.log("Search: broccoli, broccoli – local farm");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


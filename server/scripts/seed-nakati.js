/**
 * Seed 20 fresh nakati (Ethiopian eggplant leaves) products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:nakati
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-vegetables";

const NAKATI_PRODUCTS = [
  { id: "nakati-seed-01", name: "Hand-picked bunch" },
  { id: "nakati-seed-02", name: "Family pack 500g" },
  { id: "nakati-seed-03", name: "Young tender leaves" },
  { id: "nakati-seed-04", name: "Organic" },
  { id: "nakati-seed-05", name: "Baby leaves" },
  { id: "nakati-seed-06", name: "Bulk 1kg" },
  { id: "nakati-seed-07", name: "Farm fresh" },
  { id: "nakati-seed-08", name: "Export grade" },
  { id: "nakati-seed-09", name: "Premium select" },
  { id: "nakati-seed-10", name: "Local farm" },
  { id: "nakati-seed-11", name: "Stew ready" },
  { id: "nakati-seed-12", name: "Washed & trimmed" },
  { id: "nakati-seed-13", name: "Soft leaves" },
  { id: "nakati-seed-14", name: "Grade A" },
  { id: "nakati-seed-15", name: "Morning harvest" },
  { id: "nakati-seed-16", name: "Soup pack" },
  { id: "nakati-seed-17", name: "Large bunch" },
  { id: "nakati-seed-18", name: "Restaurant grade" },
  { id: "nakati-seed-19", name: "Ugandan pick" },
  { id: "nakati-seed-20", name: "One Source pick" },
];

function randomPrice(i) {
  const base = 2800 + i * 180;
  return Math.round((base + Math.floor(Math.random() * 500)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per kg";
  if (i === 1 || i === 15) return "per 500g";
  if (i === 0 || i === 16) return "per bunch";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < NAKATI_PRODUCTS.length; i++) {
    const item = NAKATI_PRODUCTS[i];
    const title = `Nakati – ${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 4 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.14) : undefined,
        rating: Number((4.2 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(40 + Math.random() * 900),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `Nakati — ${item.name}. Fresh garden egg leaves (Ethiopian eggplant greens) — steam, stew with groundnut or simsim paste, or sauté with tomatoes and onions. A beloved Ugandan staple. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 35 + Math.floor(Math.random() * 130),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed nakati failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} nakati products (${CATEGORY_ID}).`);
  console.log("Search: nakati, garden egg leaves");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

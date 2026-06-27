/**
 * Seed 20 fresh garden egg products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:garden-eggs
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-vegetables";

const GARDEN_EGG_PRODUCTS = [
  { id: "garden-egg-seed-01", name: "Garden Eggs – Hand-picked 500g" },
  { id: "garden-egg-seed-02", name: "Garden Eggs – Family pack 1kg" },
  { id: "garden-egg-seed-03", name: "Garden Eggs – White variety" },
  { id: "garden-egg-seed-04", name: "Garden Eggs – Organic" },
  { id: "garden-egg-seed-05", name: "Garden Eggs – Baby size" },
  { id: "garden-egg-seed-06", name: "Garden Eggs – Bulk 2kg" },
  { id: "garden-egg-seed-07", name: "Garden Eggs – Farm fresh" },
  { id: "garden-egg-seed-08", name: "Garden Eggs – Export grade" },
  { id: "garden-egg-seed-09", name: "Garden Eggs – Premium select" },
  { id: "garden-egg-seed-10", name: "Garden Eggs – Local farm" },
  { id: "garden-egg-seed-11", name: "Garden Eggs – Green variety" },
  { id: "garden-egg-seed-12", name: "Garden Eggs – Striped" },
  { id: "garden-egg-seed-13", name: "Garden Eggs – Tender & firm" },
  { id: "garden-egg-seed-14", name: "Garden Eggs – Grade A" },
  { id: "garden-egg-seed-15", name: "Garden Eggs – Morning harvest" },
  { id: "garden-egg-seed-16", name: "Garden Eggs – Stew pack" },
  { id: "garden-egg-seed-17", name: "Garden Eggs – Whole fruit" },
  { id: "garden-egg-seed-18", name: "Garden Eggs – Restaurant grade" },
  { id: "garden-egg-seed-19", name: "Garden Eggs – Ugandan pick" },
  { id: "garden-egg-seed-20", name: "Garden Eggs – One Source pick" },
];

function randomPrice(i) {
  const base = 3500 + i * 220;
  return Math.round((base + Math.floor(Math.random() * 650)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per 2kg";
  if (i === 0 || i === 15) return "per 500g";
  if (i === 1) return "per kg";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < GARDEN_EGG_PRODUCTS.length; i++) {
    const item = GARDEN_EGG_PRODUCTS[i];
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
        rating: Number((4.1 + Math.random() * 0.8).toFixed(1)),
        reviewCount: Math.floor(45 + Math.random() * 1100),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${item.name}. Fresh African garden eggs (eggplant) — boil, stew, grill, or use in soups and relishes. A staple across Uganda and West Africa. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 30 + Math.floor(Math.random() * 140),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed garden eggs failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} garden egg products (${CATEGORY_ID}).`);
  console.log("Search: garden egg, garden eggs, eggplant");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

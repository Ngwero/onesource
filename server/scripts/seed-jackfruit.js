/**
 * Seed 20 fresh jackfruit products into `fresh-fruits`.
 *
 * Usage:
 *   cd server && npm run seed:jackfruit
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-fruits";

const JACKFRUIT_PRODUCTS = [
  { id: "jackfruit-seed-01", name: "Jackfruit – Hand-cut 500g" },
  { id: "jackfruit-seed-02", name: "Jackfruit – Family pack 1kg" },
  { id: "jackfruit-seed-03", name: "Jackfruit – Ripe & sweet" },
  { id: "jackfruit-seed-04", name: "Jackfruit – Organic" },
  { id: "jackfruit-seed-05", name: "Jackfruit – Young green" },
  { id: "jackfruit-seed-06", name: "Jackfruit – Bulk 2kg" },
  { id: "jackfruit-seed-07", name: "Jackfruit – Farm fresh" },
  { id: "jackfruit-seed-08", name: "Jackfruit – Export grade" },
  { id: "jackfruit-seed-09", name: "Jackfruit – Premium select" },
  { id: "jackfruit-seed-10", name: "Jackfruit – Local farm" },
  { id: "jackfruit-seed-11", name: "Jackfruit – Ready to eat" },
  { id: "jackfruit-seed-12", name: "Jackfruit – Seedless pods" },
  { id: "jackfruit-seed-13", name: "Jackfruit – Tender arils" },
  { id: "jackfruit-seed-14", name: "Jackfruit – Grade A" },
  { id: "jackfruit-seed-15", name: "Jackfruit – Morning harvest" },
  { id: "jackfruit-seed-16", name: "Jackfruit – Snack pack" },
  { id: "jackfruit-seed-17", name: "Jackfruit – Whole fruit" },
  { id: "jackfruit-seed-18", name: "Jackfruit – Restaurant grade" },
  { id: "jackfruit-seed-19", name: "Jackfruit – Ugandan pick" },
  { id: "jackfruit-seed-20", name: "Jackfruit – One Source pick" },
];

function randomPrice(i) {
  const base = 6000 + i * 300;
  return Math.round((base + Math.floor(Math.random() * 1000)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per 2kg";
  if (i === 0 || i === 15) return "per 500g";
  if (i === 1) return "per kg";
  if (i === 16) return "each";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < JACKFRUIT_PRODUCTS.length; i++) {
    const item = JACKFRUIT_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 4 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.14) : undefined,
        rating: Number((4.3 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(70 + Math.random() * 1400),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.3,
        description: `${item.name}. Fresh jackfruit — sweet ripe pods for eating raw, or young green for curries and stews. A tropical favourite across Uganda. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 20 + Math.floor(Math.random() * 100),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed jackfruit failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} jackfruit products (${CATEGORY_ID}).`);
  console.log("Search: jackfruit, jack fruit");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

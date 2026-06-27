/**
 * Seed 10 fresh courgette products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:courgettes
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const COURGETTES_CATEGORY_ID = "fresh-vegetables";

const COURGETTES_PRODUCTS = [
  { id: "courgette-seed-01", name: "Fresh Courgettes – Medium" },
  { id: "courgette-seed-02", name: "Fresh Courgettes – Large" },
  { id: "courgette-seed-03", name: "Fresh Courgettes – Baby" },
  { id: "courgette-seed-04", name: "Fresh Courgettes – Organic" },
  { id: "courgette-seed-05", name: "Fresh Courgettes – Green" },
  { id: "courgette-seed-06", name: "Fresh Courgettes – Bulk" },
  { id: "courgette-seed-07", name: "Courgettes – Farm pick" },
  { id: "courgette-seed-08", name: "Courgettes – Export grade" },
  { id: "courgette-seed-09", name: "Courgettes – Premium" },
  { id: "courgette-seed-10", name: "Courgettes – Local farm" },
];

function randomPrice(i) {
  const base = 3800 + i * 280;
  return Math.round((base + Math.floor(Math.random() * 700)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per kg";
  if (i === 2) return "per 500g";
  return "each";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < COURGETTES_PRODUCTS.length; i++) {
    const item = COURGETTES_PRODUCTS[i];
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
        reviewCount: Math.floor(70 + Math.random() * 1100),
        image,
        category: COURGETTES_CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${item.name}. Tender courgettes for grilling, roasting, and stir-fries. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 35 + Math.floor(Math.random() * 130),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed courgettes failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} courgette products (${COURGETTES_CATEGORY_ID}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

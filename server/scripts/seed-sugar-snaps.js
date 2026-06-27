/**
 * Seed 20 fresh sugar snap pea products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:sugar-snaps
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-vegetables";

const SUGAR_SNAP_PRODUCTS = [
  { id: "sugar-snap-seed-01", name: "Sugar Snap Peas – Hand-picked 250g" },
  { id: "sugar-snap-seed-02", name: "Sugar Snap Peas – Family pack 500g" },
  { id: "sugar-snap-seed-03", name: "Sugar Snap Peas – Crisp & sweet" },
  { id: "sugar-snap-seed-04", name: "Sugar Snap Peas – Organic" },
  { id: "sugar-snap-seed-05", name: "Sugar Snap Peas – Baby pods" },
  { id: "sugar-snap-seed-06", name: "Sugar Snap Peas – Bulk 1kg" },
  { id: "sugar-snap-seed-07", name: "Sugar Snap Peas – Farm fresh" },
  { id: "sugar-snap-seed-08", name: "Sugar Snap Peas – Export grade" },
  { id: "sugar-snap-seed-09", name: "Sugar Snap Peas – Premium select" },
  { id: "sugar-snap-seed-10", name: "Sugar Snap Peas – Local farm" },
  { id: "sugar-snap-seed-11", name: "Sugar Snap Peas – Stir-fry ready" },
  { id: "sugar-snap-seed-12", name: "Sugar Snap Peas – Salad mix" },
  { id: "sugar-snap-seed-13", name: "Sugar Snap Peas – Tender pods" },
  { id: "sugar-snap-seed-14", name: "Sugar Snap Peas – Grade A" },
  { id: "sugar-snap-seed-15", name: "Sugar Snap Peas – Morning harvest" },
  { id: "sugar-snap-seed-16", name: "Sugar Snap Peas – Snack pack" },
  { id: "sugar-snap-seed-17", name: "Sugar Snap Peas – Whole pods" },
  { id: "sugar-snap-seed-18", name: "Sugar Snap Peas – Restaurant grade" },
  { id: "sugar-snap-seed-19", name: "Sugar Snap Peas – Green & crunchy" },
  { id: "sugar-snap-seed-20", name: "Sugar Snap Peas – One Source pick" },
];

function randomPrice(i) {
  const base = 4500 + i * 250;
  return Math.round((base + Math.floor(Math.random() * 800)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per kg";
  if (i === 0 || i === 15) return "per 250g";
  if (i === 1 || i === 11) return "per 500g";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < SUGAR_SNAP_PRODUCTS.length; i++) {
    const item = SUGAR_SNAP_PRODUCTS[i];
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
        rating: Number((4.3 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(60 + Math.random() * 1400),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.3,
        description: `${item.name}. Sweet, crunchy sugar snap peas — eat whole, raw or lightly steamed. Great for salads, stir-fries, and healthy snacking. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 40 + Math.floor(Math.random() * 160),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed sugar snaps failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} sugar snap products (${CATEGORY_ID}).`);
  console.log("Search: sugar snap, snap peas");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Seed 20 fresh French bean products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:french-beans
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-vegetables";

const FRENCH_BEAN_PRODUCTS = [
  { id: "french-bean-seed-01", name: "French Beans – Hand-picked 250g" },
  { id: "french-bean-seed-02", name: "French Beans – Family pack 500g" },
  { id: "french-bean-seed-03", name: "French Beans – Fine & tender" },
  { id: "french-bean-seed-04", name: "French Beans – Organic" },
  { id: "french-bean-seed-05", name: "French Beans – Baby beans" },
  { id: "french-bean-seed-06", name: "French Beans – Bulk 1kg" },
  { id: "french-bean-seed-07", name: "French Beans – Farm fresh" },
  { id: "french-bean-seed-08", name: "French Beans – Export grade" },
  { id: "french-bean-seed-09", name: "French Beans – Premium select" },
  { id: "french-bean-seed-10", name: "French Beans – Local farm" },
  { id: "french-bean-seed-11", name: "French Beans – Stir-fry ready" },
  { id: "french-bean-seed-12", name: "French Beans – Trimmed" },
  { id: "french-bean-seed-13", name: "French Beans – Stringless" },
  { id: "french-bean-seed-14", name: "French Beans – Grade A" },
  { id: "french-bean-seed-15", name: "French Beans – Morning harvest" },
  { id: "french-bean-seed-16", name: "French Beans – Snack pack" },
  { id: "french-bean-seed-17", name: "French Beans – Whole pods" },
  { id: "french-bean-seed-18", name: "French Beans – Restaurant grade" },
  { id: "french-bean-seed-19", name: "French Beans – Crisp & green" },
  { id: "french-bean-seed-20", name: "French Beans – One Source pick" },
];

function randomPrice(i) {
  const base = 4000 + i * 230;
  return Math.round((base + Math.floor(Math.random() * 700)) / 100) * 100;
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

  for (let i = 0; i < FRENCH_BEAN_PRODUCTS.length; i++) {
    const item = FRENCH_BEAN_PRODUCTS[i];
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
        rating: Number((4.2 + Math.random() * 0.8).toFixed(1)),
        reviewCount: Math.floor(50 + Math.random() * 1250),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.3,
        description: `${item.name}. Tender French beans (haricots verts) — steam, sauté, or add to stews and salads. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 40 + Math.floor(Math.random() * 150),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed French beans failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} French bean products (${CATEGORY_ID}).`);
  console.log("Search: french bean, french beans, haricot");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

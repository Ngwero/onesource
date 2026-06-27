/**
 * Seed 10 fresh passion fruit products into `fresh-fruits`.
 *
 * Usage:
 *   cd server && npm run seed:passion-fruits
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-fruits";

const PASSION_FRUIT_PRODUCTS = [
  { id: "passion-fruit-seed-01", name: "Passion Fruits – Hand-picked 6 pack" },
  { id: "passion-fruit-seed-02", name: "Passion Fruits – Family pack 12" },
  { id: "passion-fruit-seed-03", name: "Passion Fruits – Sweet & ripe" },
  { id: "passion-fruit-seed-04", name: "Passion Fruits – Organic" },
  { id: "passion-fruit-seed-05", name: "Passion Fruits – Purple variety" },
  { id: "passion-fruit-seed-06", name: "Passion Fruits – Bulk 1kg" },
  { id: "passion-fruit-seed-07", name: "Passion Fruits – Farm fresh" },
  { id: "passion-fruit-seed-08", name: "Passion Fruits – Export grade" },
  { id: "passion-fruit-seed-09", name: "Passion Fruits – Juice grade" },
  { id: "passion-fruit-seed-10", name: "Passion Fruits – One Source pick" },
];

function randomPrice(i) {
  const base = 5500 + i * 350;
  return Math.round((base + Math.floor(Math.random() * 900)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per kg";
  if (i === 0) return "per 6";
  if (i === 1) return "per 12";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < PASSION_FRUIT_PRODUCTS.length; i++) {
    const item = PASSION_FRUIT_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 3 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.16) : undefined,
        rating: Number((4.4 + Math.random() * 0.6).toFixed(1)),
        reviewCount: Math.floor(80 + Math.random() * 1500),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.3,
        description: `${item.name}. Aromatic passion fruits with tangy-sweet pulp — eat fresh, blend into juice, or use in desserts and cocktails. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 25 + Math.floor(Math.random() * 120),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed passion fruits failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} passion fruit products (${CATEGORY_ID}).`);
  console.log("Search: passion fruit, passion fruits");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

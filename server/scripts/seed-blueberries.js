/**
 * Seed 20 blueberry products in fresh-fruits.
 * Replaces former Garden Sprayer bulk rows in place (same IDs, new titles).
 *
 *   cd server && npm run seed:blueberries
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import {
  BLUEBERRIES_CATEGORY_ID,
  BLUEBERRY_PRODUCTS,
  blueberryImage,
} from "../data/blueberriesCatalog.js";

function randomPrice(i) {
  const base = 4500 + i * 280;
  return Math.round((base + Math.floor(Math.random() * 1200)) / 100) * 100;
}

function descriptionFor(name) {
  return `Plump, antioxidant-rich ${name.toLowerCase()}. Great for breakfast bowls, baking, smoothies, and snacking.`;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < BLUEBERRY_PRODUCTS.length; i++) {
    const item = BLUEBERRY_PRODUCTS[i];
    const title = item.name.includes("One Source") ? item.name : `${item.name} – One Source`;
    const price = randomPrice(i);

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 4 === 0 ? Math.round(price * 1.12) : undefined,
        rating: Number((4.2 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(120 + Math.random() * 4800),
        image: blueberryImage(item.photo ?? i),
        category: BLUEBERRIES_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.25,
        description: descriptionFor(item.name),
        inStock: true,
        stockQuantity: 60 + Math.floor(Math.random() * 180),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} blueberry products (${BLUEBERRIES_CATEGORY_ID}).`);
  for (const item of BLUEBERRY_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

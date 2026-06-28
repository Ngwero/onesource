/**
 * Seed 20 blueberry products in fresh-fruits.
 * Images are stored in Supabase Storage (works on Railway + local).
 *
 *   cd server && npm run seed:blueberries
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { seedImageToSupabase } from "../lib/seedImage.js";
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

function safeObjectId(productId) {
  return productId.replace(/[^a-zA-Z0-9-_]/g, "-");
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < BLUEBERRY_PRODUCTS.length; i++) {
    const item = BLUEBERRY_PRODUCTS[i];
    const title = item.name.includes("One Source") ? item.name : `${item.name} – One Source`;
    const price = randomPrice(i);
    const sourceUrl = blueberryImage(item.photo ?? i);
    const objectPath = `products/seed-blueberry-${safeObjectId(item.id)}.webp`;
    const image = await seedImageToSupabase(sourceUrl, objectPath);

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 4 === 0 ? Math.round(price * 1.12) : undefined,
        rating: Number((4.2 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(120 + Math.random() * 4800),
        image,
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

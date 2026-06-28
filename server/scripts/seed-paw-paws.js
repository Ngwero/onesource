/**
 * Replace cow pea products (cowpea-01…10) with paw paws in fresh-fruits.
 * Preserves existing images unless --with-images or product has no image.
 *
 *   cd server && npm run seed:paw-paws
 *   cd server && npm run seed:paw-paws -- --with-images
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { seedImageToSupabase } from "../lib/seedImage.js";
import {
  PAW_PAWS_CATEGORY_ID,
  PAW_PAW_PRODUCTS,
  pawPawImage,
} from "../data/pawPawsCatalog.js";

const withImages = process.argv.includes("--with-images");

function randomPrice(i) {
  const base = 3200 + i * 280;
  return Math.round((base + Math.floor(Math.random() * 900)) / 100) * 100;
}

function descriptionFor(name) {
  return `Sweet, ripe ${name.toLowerCase()}. Perfect for breakfast, smoothies, salads, or eating fresh.`;
}

function safeObjectId(productId) {
  return productId.replace(/[^a-zA-Z0-9-_]/g, "-");
}

async function main() {
  const db = requireSupabase();
  const ids = PAW_PAW_PRODUCTS.map((p) => p.id);
  const { data: existingRows } = await db.from("products").select("id, image").in("id", ids);
  const imageById = Object.fromEntries((existingRows ?? []).map((r) => [r.id, r.image]));

  const rows = [];

  for (let i = 0; i < PAW_PAW_PRODUCTS.length; i++) {
    const item = PAW_PAW_PRODUCTS[i];
    const title = item.name.includes("One Source") ? item.name : `${item.name} – One Source`;
    const price = randomPrice(i);

    let image = imageById[item.id];
    if (withImages || !image) {
      const sourceUrl = pawPawImage(item.photo ?? i);
      const objectPath = `products/seed-pawpaw-${safeObjectId(item.id)}.webp`;
      image = await seedImageToSupabase(sourceUrl, objectPath);
    }

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.1) : undefined,
        rating: Number((4.2 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(90 + Math.random() * 4500),
        image,
        category: PAW_PAWS_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.3,
        description: descriptionFor(item.name),
        inStock: true,
        stockQuantity: 70 + Math.floor(Math.random() * 150),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Replaced ${rows.length} products with paw paws (${PAW_PAWS_CATEGORY_ID}).`);
  for (const item of PAW_PAW_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

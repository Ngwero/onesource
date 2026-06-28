/**
 * Seed 10 raspberry products in fresh-fruits.
 * Does NOT overwrite images unless you pass --with-images.
 *
 *   cd server && npm run seed:raspberries
 *   cd server && npm run seed:raspberries -- --with-images
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { seedImageToSupabase } from "../lib/seedImage.js";
import {
  RASPBERRIES_CATEGORY_ID,
  RASPBERRY_PRODUCTS,
  raspberryImage,
} from "../data/raspberriesCatalog.js";

const withImages = process.argv.includes("--with-images");

function randomPrice(i) {
  const base = 5200 + i * 320;
  return Math.round((base + Math.floor(Math.random() * 1400)) / 100) * 100;
}

function descriptionFor(name) {
  return `Fragrant, sweet-tart ${name.toLowerCase()}. Perfect for puddings, yoghurt, smoothies, or eating fresh.`;
}

function safeObjectId(productId) {
  return productId.replace(/[^a-zA-Z0-9-_]/g, "-");
}

async function main() {
  const db = requireSupabase();
  const ids = RASPBERRY_PRODUCTS.map((p) => p.id);
  const { data: existingRows } = await db.from("products").select("id, image").in("id", ids);
  const imageById = Object.fromEntries((existingRows ?? []).map((r) => [r.id, r.image]));

  const rows = [];

  for (let i = 0; i < RASPBERRY_PRODUCTS.length; i++) {
    const item = RASPBERRY_PRODUCTS[i];
    const title = item.name.includes("One Source") ? item.name : `${item.name} – One Source`;
    const price = randomPrice(i);

    let image = imageById[item.id];
    if (withImages || !image) {
      const sourceUrl = raspberryImage(item.photo ?? i);
      const objectPath = `products/seed-raspberry-${safeObjectId(item.id)}.webp`;
      image = await seedImageToSupabase(sourceUrl, objectPath);
    }

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.1) : undefined,
        rating: Number((4.3 + Math.random() * 0.6).toFixed(1)),
        reviewCount: Math.floor(80 + Math.random() * 4200),
        image,
        category: RASPBERRIES_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.3,
        description: descriptionFor(item.name),
        inStock: true,
        stockQuantity: 55 + Math.floor(Math.random() * 160),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(
    `Seeded ${rows.length} raspberry products` +
      (withImages ? " (images set)" : " (images preserved)")
  );
  for (const item of RASPBERRY_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

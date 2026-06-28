/**
 * Seed 10 cow pea products in legumes-and-pulses.
 * Does NOT overwrite images unless you pass --with-images.
 *
 *   cd server && npm run seed:cow-peas
 *   cd server && npm run seed:cow-peas -- --with-images
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { seedImageToSupabase } from "../lib/seedImage.js";
import {
  COW_PEAS_CATEGORY_ID,
  COW_PEA_PRODUCTS,
  cowPeaImage,
} from "../data/cowPeasCatalog.js";

const withImages = process.argv.includes("--with-images");

function randomPrice(i) {
  const base = 3800 + i * 250;
  return Math.round((base + Math.floor(Math.random() * 1100)) / 100) * 100;
}

function descriptionFor(name) {
  return `Nutritious ${name.toLowerCase()} from Ugandan farms. High in protein and fibre — ideal for stews, soups, and traditional dishes.`;
}

function safeObjectId(productId) {
  return productId.replace(/[^a-zA-Z0-9-_]/g, "-");
}

async function main() {
  const db = requireSupabase();
  const ids = COW_PEA_PRODUCTS.map((p) => p.id);
  const { data: existingRows } = await db.from("products").select("id, image").in("id", ids);
  const imageById = Object.fromEntries((existingRows ?? []).map((r) => [r.id, r.image]));

  const rows = [];

  for (let i = 0; i < COW_PEA_PRODUCTS.length; i++) {
    const item = COW_PEA_PRODUCTS[i];
    const title = item.name.includes("One Source") ? item.name : `${item.name} – One Source`;
    const price = randomPrice(i);

    let image = imageById[item.id];
    if (withImages || !image) {
      const sourceUrl = cowPeaImage(item.photo ?? i);
      const objectPath = `products/seed-cowpea-${safeObjectId(item.id)}.webp`;
      image = await seedImageToSupabase(sourceUrl, objectPath);
    }

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 4 === 0 ? Math.round(price * 1.08) : undefined,
        rating: Number((4.1 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(60 + Math.random() * 3800),
        image,
        category: COW_PEAS_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.35,
        description: descriptionFor(item.name),
        inStock: true,
        stockQuantity: 80 + Math.floor(Math.random() * 200),
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
    `Seeded ${rows.length} cow pea products` +
      (withImages ? " (images set)" : " (images preserved)")
  );
  for (const item of COW_PEA_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Seed 10 yam products in Roots and Tubers category.
 *
 *   cd server && npm run seed:yams
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import { YAM_PRODUCTS, YAMS_CATEGORY_ID } from "../data/yamsCatalog.js";

function randomPrice(base = 3500) {
  return Math.round((base + Math.floor(Math.random() * 9000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < YAM_PRODUCTS.length; i++) {
    const item = YAM_PRODUCTS[i];
    const image = await ensureProductPlaceholder(item.id, item.name);
    const price = randomPrice(3000 + i * 450);
    const title = `${item.name} – One Source`;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.1) : undefined,
        rating: Number((4.1 + Math.random() * 0.8).toFixed(1)),
        reviewCount: Math.floor(40 + Math.random() * 500),
        image,
        category: YAMS_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.4,
        description: `Fresh yam. ${item.name}. Ideal for boiling, roasting, and traditional dishes. Upload your photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 50 + Math.floor(Math.random() * 150),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} yam products (${YAMS_CATEGORY_ID}).`);
  console.log("Search: yam / yams");
  for (const item of YAM_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

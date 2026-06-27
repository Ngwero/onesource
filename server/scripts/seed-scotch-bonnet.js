/**
 * Seed 10 Scotch bonnet products in Chillies and Peppers category.
 *
 *   cd server && npm run seed:scotch-bonnet
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import {
  SCOTCH_BONNET_PRODUCTS,
  CHILLIES_CATEGORY_ID,
} from "../data/scotchBonnetCatalog.js";

function randomPrice(base = 4500) {
  return Math.round((base + Math.floor(Math.random() * 10000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < SCOTCH_BONNET_PRODUCTS.length; i++) {
    const item = SCOTCH_BONNET_PRODUCTS[i];
    const image = await ensureProductPlaceholder(item.id, item.name);
    const price = randomPrice(4000 + i * 500);
    const title = `${item.name} – One Source`;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.14) : undefined,
        rating: Number((4.3 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(60 + Math.random() * 700),
        image,
        category: CHILLIES_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.35,
        description: `Hot Scotch bonnet peppers. ${item.name}. Perfect for jerk seasoning, pepper sauce, and Caribbean dishes. Upload your photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 30 + Math.floor(Math.random() * 90),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} Scotch bonnet products (${CHILLIES_CATEGORY_ID}).`);
  console.log("Search: scotch bonnet");
  for (const item of SCOTCH_BONNET_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

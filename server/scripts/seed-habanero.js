/**
 * Seed 10 Habanero products in Chillies and Peppers category.
 *
 *   cd server && npm run seed:habanero
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import {
  HABANERO_PRODUCTS,
  CHILLIES_CATEGORY_ID,
} from "../data/habaneroCatalog.js";

function randomPrice(base = 5000) {
  return Math.round((base + Math.floor(Math.random() * 11000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < HABANERO_PRODUCTS.length; i++) {
    const item = HABANERO_PRODUCTS[i];
    const image = await ensureProductPlaceholder(item.id, item.name);
    const price = randomPrice(4500 + i * 500);
    const title = `${item.name} – One Source`;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.15) : undefined,
        rating: Number((4.3 + Math.random() * 0.75).toFixed(1)),
        reviewCount: Math.floor(55 + Math.random() * 750),
        image,
        category: CHILLIES_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.35,
        description: `Hot Habanero peppers. ${item.name}. Intense heat for sauces, marinades, and spicy dishes. Upload your photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 25 + Math.floor(Math.random() * 85),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} Habanero products (${CHILLIES_CATEGORY_ID}).`);
  console.log("Search: habanero");
  for (const item of HABANERO_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

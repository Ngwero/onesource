/**
 * Seed 10 green chilli products in Chillies and Peppers category.
 *
 *   cd server && npm run seed:green-chillies
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import {
  GREEN_CHILLIES_PRODUCTS,
  CHILLIES_CATEGORY_ID,
} from "../data/greenChilliesCatalog.js";

function randomPrice(base = 3000) {
  return Math.round((base + Math.floor(Math.random() * 8000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < GREEN_CHILLIES_PRODUCTS.length; i++) {
    const item = GREEN_CHILLIES_PRODUCTS[i];
    const image = await ensureProductPlaceholder(item.id, item.name);
    const price = randomPrice(2500 + i * 400);
    const title = `${item.name} – One Source`;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.12) : undefined,
        rating: Number((4.2 + Math.random() * 0.75).toFixed(1)),
        reviewCount: Math.floor(50 + Math.random() * 600),
        image,
        category: CHILLIES_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.4,
        description: `Fresh green chillies. ${item.name}. Ideal for curries, stews, and sauces. Upload your photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 40 + Math.floor(Math.random() * 100),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} green chilli products (${CHILLIES_CATEGORY_ID}).`);
  console.log("Search: green chilli / green chillies");
  for (const item of GREEN_CHILLIES_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

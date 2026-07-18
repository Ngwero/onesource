/**
 * Seed 10 export-grade Broad Bean products.
 *
 *   cd server && npm run seed:broad-beans
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import {
  BROAD_BEANS_PRODUCTS,
  EXPORT_CATEGORY_ID,
} from "../data/broadBeansCatalog.js";

function randomPrice(base = 4500) {
  return Math.round((base + Math.floor(Math.random() * 9000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < BROAD_BEANS_PRODUCTS.length; i++) {
    const item = BROAD_BEANS_PRODUCTS[i];
    const image = await ensureProductPlaceholder(item.id, item.name);
    const price = randomPrice(4000 + i * 450);

    rows.push(
      seedRowFromJson({
        id: item.id,
        title: `${item.name} – One Source`,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.12) : undefined,
        rating: Number((4.2 + Math.random() * 0.75).toFixed(1)),
        reviewCount: Math.floor(45 + Math.random() * 580),
        image,
        category: EXPORT_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.4,
        description: `${item.name}. Fresh Ugandan broad beans, carefully harvested, graded and cold-chain packed for international export. Ideal for retail, foodservice and wholesale buyers.`,
        inStock: true,
        stockQuantity: 35 + Math.floor(Math.random() * 100),
        delivery: "Export documentation and airfreight support available",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} Broad Bean products (${EXPORT_CATEGORY_ID}).`);
  for (const item of BROAD_BEANS_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

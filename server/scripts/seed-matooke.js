/**
 * Seed 10 export-grade Matooke products.
 *
 *   cd server && npm run seed:matooke
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import {
  MATOOKE_PRODUCTS,
  EXPORT_CATEGORY_ID,
} from "../data/matookeCatalog.js";

function randomPrice(base = 12000) {
  return Math.round((base + Math.floor(Math.random() * 22000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < MATOOKE_PRODUCTS.length; i++) {
    const item = MATOOKE_PRODUCTS[i];
    const image = await ensureProductPlaceholder(item.id, item.name);
    const price = randomPrice(10000 + i * 1200);

    rows.push(
      seedRowFromJson({
        id: item.id,
        title: `${item.name} – One Source`,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.12) : undefined,
        rating: Number((4.3 + Math.random() * 0.65).toFixed(1)),
        reviewCount: Math.floor(55 + Math.random() * 650),
        image,
        category: EXPORT_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.35,
        description: `${item.name}. Fresh Ugandan cooking bananas selected at the ideal maturity, carefully handled and export packed for international retail, foodservice and wholesale buyers.`,
        inStock: true,
        stockQuantity: 30 + Math.floor(Math.random() * 90),
        delivery: "Export documentation and airfreight support available",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} Matooke products (${EXPORT_CATEGORY_ID}).`);
  for (const item of MATOOKE_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

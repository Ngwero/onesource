/**
 * Seed 10 piri piri / peri-peri chilli products.
 *
 *   cd server && npm run seed:peri-peri
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import {
  PERI_PERI_PRODUCTS,
  CHILLIES_CATEGORY_ID,
} from "../data/periPeriCatalog.js";

function randomPrice(base = 4000) {
  return Math.round((base + Math.floor(Math.random() * 9000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < PERI_PERI_PRODUCTS.length; i++) {
    const item = PERI_PERI_PRODUCTS[i];
    const image = await ensureProductPlaceholder(item.id, item.name);
    const price = randomPrice(3800 + i * 450);
    const title = `${item.name} – One Source`;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: i % 3 === 0 ? Math.round(price * 1.13) : undefined,
        rating: Number((4.2 + Math.random() * 0.8).toFixed(1)),
        reviewCount: Math.floor(45 + Math.random() * 650),
        image,
        category: CHILLIES_CATEGORY_ID,
        unit: item.unit,
        prime: Math.random() > 0.35,
        description: `Piri piri / peri-peri chilli. ${item.name}. Classic African-Portuguese heat for grills, marinades, and peri-peri sauce. Upload your photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 30 + Math.floor(Math.random() * 95),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} piri piri / peri-peri products (${CHILLIES_CATEGORY_ID}).`);
  console.log("Search: piri piri, peri-peri, peri peri");
  for (const item of PERI_PERI_PRODUCTS) {
    console.log(`  • ${item.id} — ${item.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Create Chillies and Peppers category + all catalogue products.
 *
 *   cd server && npm run seed:chillies
 *   cd server && npm run seed:chillies -- --dry-run
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";
import {
  CHILLIES_CATEGORY,
  CHILLIES_CATEGORY_ID,
  CHILLIES_PRODUCTS,
  chilliesProductId,
} from "../data/chilliesCatalog.js";
import { AGRI_CATEGORIES } from "../data/categories.js";

const dryRun = process.argv.includes("--dry-run");

function randomPrice(base = 3500) {
  return Math.round((base + Math.floor(Math.random() * 12000)) / 100) * 100;
}

function buildProduct(item, image) {
  const id = chilliesProductId(item.name);
  const title = `${item.name} – One Source`;
  const price = randomPrice(
    item.section === "Processed Chilli Products"
      ? 4500
      : item.section === "Dried Chillies"
        ? 5000
        : 3000
  );

  return {
    row: seedRowFromJson({
      id,
      title,
      price,
      originalPrice: Math.random() > 0.65 ? Math.round(price * 1.15) : undefined,
      rating: Number((4.1 + Math.random() * 0.85).toFixed(1)),
      reviewCount: Math.floor(40 + Math.random() * 800),
      image,
      category: CHILLIES_CATEGORY_ID,
      unit: item.unit,
      prime: Math.random() > 0.35,
      description: `${item.section}. ${item.name}. Fresh chillies and peppers from One Source Uganda. Upload your product photo in admin to replace the placeholder.`,
      inStock: true,
      stockQuantity: 25 + Math.floor(Math.random() * 120),
      delivery: "FREE same-day delivery on orders over USh 100,000",
    }),
    id,
    title,
  };
}

async function main() {
  const db = requireSupabase();
  const sortOrder = AGRI_CATEGORIES.findIndex((c) => c.id === "herbs-and-spices");
  const insertAt = sortOrder >= 0 ? sortOrder + 1 : AGRI_CATEGORIES.length;

  const categoryRow = {
    id: CHILLIES_CATEGORY.id,
    name: CHILLIES_CATEGORY.name,
    icon: CHILLIES_CATEGORY.icon,
    category_group: CHILLIES_CATEGORY.group,
    sort_order: insertAt,
    image: null,
    active: true,
  };

  if (dryRun) {
    console.log(`[dry-run] Would upsert category: ${CHILLIES_CATEGORY.name}`);
    console.log(`[dry-run] Would upsert ${CHILLIES_PRODUCTS.length} products:\n`);
    for (const item of CHILLIES_PRODUCTS) {
      console.log(`  [${item.section}] ${item.name} (${chilliesProductId(item.name)})`);
    }
    return;
  }

  const { error: catError } = await db
    .from("categories")
    .upsert(categoryRow, { onConflict: "id" });
  if (catError) {
    console.error("Category upsert failed:", catError.message);
    console.error("Run server/supabase/categories.sql in Supabase first.");
    process.exit(1);
  }

  const rows = [];
  for (const item of CHILLIES_PRODUCTS) {
    const id = chilliesProductId(item.name);
    const image = await ensureProductPlaceholder(id, item.name);
    const { row } = buildProduct(item, image);
    rows.push(row);
  }

  const BATCH = 30;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await db.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error("Product upsert failed:", error.message);
      process.exit(1);
    }
    upserted += chunk.length;
  }

  console.log(`\nChillies category seeded: ${CHILLIES_CATEGORY.name} (${CHILLIES_CATEGORY_ID})`);
  console.log(`Products upserted: ${upserted}`);
  console.log("\nBy section:");
  const bySection = {};
  for (const p of CHILLIES_PRODUCTS) {
    bySection[p.section] = (bySection[p.section] ?? 0) + 1;
  }
  for (const [section, count] of Object.entries(bySection)) {
    console.log(`  ${section}: ${count}`);
  }
  console.log(
    `\nShop: /category/${CHILLIES_CATEGORY_ID}`
  );
  console.log(
    "Placeholders: server/uploads/products/placeholders/chilli-*.webp"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

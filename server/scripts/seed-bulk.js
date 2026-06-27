/**
 * Bulk-generate products with images across all categories.
 *
 * Usage:
 *   cd server && npm run seed:bulk
 *   cd server && npm run seed:bulk -- --per-category=10
 *   cd server && npm run seed:bulk -- --force
 *
 * Requires: server/.env + products table (schema.sql)
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { BULK_CATALOG, unsplashImage } from "../data/bulkCatalog.js";

const VERIFIED_PHOTOS = [
  "1619546819796-9d9777d80269",
  "1603833660818-4e1477a4c4d7",
  "1459411552884-841db9b3f2bb",
  "1592924333638-568c7c65fb62",
  "1622206151226-18ca2c9ab4a1",
  "1618375569909-a6e285c5dfca",
  "1447175008436-1701707538da",
  "1523049673857-eb18f1d7b578",
  "1518977676601-b53f82aba655",
  "1508747703725-3e8b046331e0",
  "1464965911861-746a04b4bca6",
  "1498557850523-fd3d118b962e",
  "1547514704-5ce94b527e52",
  "1587735243615-c03a25aaff33",
  "1553279777-2a6e2c0e8c1a",
  "1550258987-190b2d41a8a5",
  "1632280007412-b71e0aaea1b4",
  "1598110750624-20704084e04e",
  "1512621776951-a57141f2eefd",
  "1576045057995-568f588fb82f",
  "1551752494-213fd7f21e8f",
  "1577069861036-d4c6c2b0e8c8",
  "1611080620898-05e2ccbcfe79",
  "1605027990121-4751ddfbef54",
];

function parseArgs() {
  const perCategory = Number(
    process.argv.find((a) => a.startsWith("--per-category="))?.split("=")[1] ?? 0
  );
  const force = process.argv.includes("--force");
  const variants = process.argv.includes("--variants");
  return {
    perCategory: perCategory > 0 ? perCategory : null,
    force,
    variants,
  };
}

function pickPhoto(globalIndex) {
  return VERIFIED_PHOTOS[globalIndex % VERIFIED_PHOTOS.length];
}

function randomPrice(base = 8000) {
  const spread = Math.floor(Math.random() * 45000);
  return Math.round((base + spread) / 100) * 100;
}

function buildProducts({ perCategory, variants }) {
  const out = [];
  let photoIdx = 0;

  for (const cat of BULK_CATALOG) {
    const items = perCategory
      ? Array.from({ length: perCategory }, (_, i) => {
          const template = cat.items[i % cat.items.length];
          return {
            ...template,
            name: variants && i >= cat.items.length
              ? `${template.name} – Grade ${String.fromCharCode(65 + (i % 3))}`
              : template.name,
          };
        })
      : cat.items;

    items.forEach((item, i) => {
      const photoId = pickPhoto(photoIdx++);
      const id = `bulk-${cat.id}-${String(i + 1).padStart(3, "0")}`;
      const price = randomPrice(3000 + i * 500);
      const hasDeal = Math.random() > 0.7;

      out.push({
        id,
        title: `${item.name} – One Source`,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.25) : undefined,
        rating: Number((4 + Math.random() * 0.9).toFixed(1)),
        reviewCount: Math.floor(200 + Math.random() * 8000),
        image: unsplashImage(photoId),
        category: cat.id,
        unit: item.unit ?? "each",
        prime: Math.random() > 0.25,
        description: `Fresh ${item.name.toLowerCase()} sourced from Ugandan farms and cooperatives. Quality checked for market and home delivery.`,
        inStock: true,
        delivery: "FREE same-day delivery on orders over USh 100,000",
        stockQuantity: 50 + Math.floor(Math.random() * 150),
      });
    });
  }

  return out;
}

async function main() {
  const { perCategory, force, variants } = parseArgs();
  const db = requireSupabase();
  const products = buildProducts({ perCategory, variants });
  const rows = products.map(seedRowFromJson);

  if (!force) {
    const { count } = await db.from("products").select("*", { count: "exact", head: true });
    if ((count ?? 0) === 0) {
      console.log("No products yet — also run: npm run seed (optional baseline 24 items)");
    }
  } else {
    console.log("Upserting bulk catalog (--force)…");
  }

  const BATCH = 50;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await db.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error("Bulk seed failed:", error.message);
      process.exit(1);
    }
    upserted += chunk.length;
  }

  console.log(`Bulk seed complete: ${upserted} products upserted across ${BULK_CATALOG.length} categories.`);
  console.log("Refresh the shop — images load from Unsplash URLs automatically.");
  if (!force) {
    console.log("Tip: re-run with --force to update existing bulk-* products.");
  }
}

main();

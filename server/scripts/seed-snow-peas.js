/**
 * Seed 20 fresh snow pea products into `fresh-vegetables`.
 *
 * Usage:
 *   cd server && npm run seed:snow-peas
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fresh-vegetables";

const SNOW_PEA_PRODUCTS = [
  { id: "snow-pea-seed-01", name: "Snow Peas – Hand-picked 250g" },
  { id: "snow-pea-seed-02", name: "Snow Peas – Family pack 500g" },
  { id: "snow-pea-seed-03", name: "Snow Peas – Flat & tender" },
  { id: "snow-pea-seed-04", name: "Snow Peas – Organic" },
  { id: "snow-pea-seed-05", name: "Snow Peas – Baby pods" },
  { id: "snow-pea-seed-06", name: "Snow Peas – Bulk 1kg" },
  { id: "snow-pea-seed-07", name: "Snow Peas – Farm fresh" },
  { id: "snow-pea-seed-08", name: "Snow Peas – Export grade" },
  { id: "snow-pea-seed-09", name: "Snow Peas – Premium select" },
  { id: "snow-pea-seed-10", name: "Snow Peas – Local farm" },
  { id: "snow-pea-seed-11", name: "Snow Peas – Stir-fry ready" },
  { id: "snow-pea-seed-12", name: "Snow Peas – Salad garnish" },
  { id: "snow-pea-seed-13", name: "Snow Peas – Tender pods" },
  { id: "snow-pea-seed-14", name: "Snow Peas – Grade A" },
  { id: "snow-pea-seed-15", name: "Snow Peas – Morning harvest" },
  { id: "snow-pea-seed-16", name: "Snow Peas – Snack pack" },
  { id: "snow-pea-seed-17", name: "Snow Peas – Whole pods" },
  { id: "snow-pea-seed-18", name: "Snow Peas – Restaurant grade" },
  { id: "snow-pea-seed-19", name: "Snow Peas – Sweet & crisp" },
  { id: "snow-pea-seed-20", name: "Snow Peas – One Source pick" },
];

function randomPrice(i) {
  const base = 4200 + i * 240;
  return Math.round((base + Math.floor(Math.random() * 750)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per kg";
  if (i === 0 || i === 15) return "per 250g";
  if (i === 1 || i === 11) return "per 500g";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < SNOW_PEA_PRODUCTS.length; i++) {
    const item = SNOW_PEA_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 4 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.15) : undefined,
        rating: Number((4.2 + Math.random() * 0.8).toFixed(1)),
        reviewCount: Math.floor(55 + Math.random() * 1300),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.3,
        description: `${item.name}. Delicate flat snow peas with a sweet, mild flavour — perfect for stir-fries, salads, and Asian dishes. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 35 + Math.floor(Math.random() * 165),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed snow peas failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} snow pea products (${CATEGORY_ID}).`);
  console.log("Search: snow pea, snow peas");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

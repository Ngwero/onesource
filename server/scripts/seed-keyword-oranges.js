/**
 * Add orange products if fewer than 6 match "orange" in title.
 *   cd server && node scripts/seed-keyword-oranges.js
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const ORANGE_ITEMS = [
  { name: "Oranges – Navel", unit: "per kg" },
  { name: "Oranges – Valencia", unit: "per kg" },
  { name: "Oranges – Sweet", unit: "per kg" },
  { name: "Blood Oranges", unit: "per kg" },
  { name: "Tangerines – Pack", unit: "per pack" },
  { name: "Oranges – Juicing", unit: "per kg" },
];

function randomPrice(base = 6000) {
  return Math.round((base + Math.floor(Math.random() * 8000)) / 100) * 100;
}

async function main() {
  const db = requireSupabase();
  const { data: existing } = await db.from("products").select("id, title");

  const orangeTitles = new Set(
    (existing ?? [])
      .filter((p) => /orange/i.test(p.title))
      .map((p) => p.title.toLowerCase())
  );

  const toAdd = [];
  let i = 0;
  for (const item of ORANGE_ITEMS) {
    const title = `${item.name} – One Source`;
    if (orangeTitles.has(title.toLowerCase())) continue;
    const id = `fill-orange-${String(++i).padStart(2, "0")}`;
    const price = randomPrice(5000);
    const image = await ensureProductPlaceholder(id, item.name);
    toAdd.push(
      seedRowFromJson({
        id,
        title,
        price,
        originalPrice: i % 2 === 0 ? Math.round(price * 1.15) : undefined,
        rating: 4.5,
        reviewCount: 400 + i * 120,
        image,
        category: "fresh-fruits",
        unit: item.unit,
        prime: true,
        description: `${item.name}. Fresh citrus from Ugandan growers. Replace placeholder image in admin.`,
        inStock: true,
        stockQuantity: 80,
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  if (!toAdd.length) {
    console.log(`Already have ${orangeTitles.size} orange products — nothing to add.`);
    return;
  }

  const { error } = await db.from("products").upsert(toAdd, { onConflict: "id" });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`Added ${toAdd.length} orange products (${orangeTitles.size} already existed).`);
}

main();

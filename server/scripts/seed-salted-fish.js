/**
 * Seed 20 salted fish products into `fish-and-aquaculture`.
 *
 * Usage:
 *   cd server && npm run seed:salted-fish
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fish-and-aquaculture";

const SALTED_FISH_PRODUCTS = [
  { id: "salted-fish-seed-01", name: "Salted Fish – Tilapia 500g" },
  { id: "salted-fish-seed-02", name: "Salted Fish – Nile Perch 1kg" },
  { id: "salted-fish-seed-03", name: "Salted Fish – Mackerel pieces" },
  { id: "salted-fish-seed-04", name: "Salted Fish – Silver fish (Mukene)" },
  { id: "salted-fish-seed-05", name: "Salted Fish – Dagaa dried" },
  { id: "salted-fish-seed-06", name: "Salted Fish – Bulk 2kg" },
  { id: "salted-fish-seed-07", name: "Salted Fish – Farm cured" },
  { id: "salted-fish-seed-08", name: "Salted Fish – Export grade" },
  { id: "salted-fish-seed-09", name: "Salted Fish – Premium select" },
  { id: "salted-fish-seed-10", name: "Salted Fish – Lake Victoria" },
  { id: "salted-fish-seed-11", name: "Salted Fish – Catfish fillets" },
  { id: "salted-fish-seed-12", name: "Salted Fish – Whole small" },
  { id: "salted-fish-seed-13", name: "Salted Fish – Stew cut" },
  { id: "salted-fish-seed-14", name: "Salted Fish – Grade A" },
  { id: "salted-fish-seed-15", name: "Salted Fish – Sun-dried" },
  { id: "salted-fish-seed-16", name: "Salted Fish – Snack pack" },
  { id: "salted-fish-seed-17", name: "Salted Fish – Boneless pieces" },
  { id: "salted-fish-seed-18", name: "Salted Fish – Restaurant grade" },
  { id: "salted-fish-seed-19", name: "Salted Fish – Ugandan pick" },
  { id: "salted-fish-seed-20", name: "Salted Fish – One Source pick" },
];

function randomPrice(i) {
  const base = 8000 + i * 400;
  return Math.round((base + Math.floor(Math.random() * 1200)) / 100) * 100;
}

function unitForIndex(i) {
  if (i === 5) return "per 2kg";
  if (i === 0 || i === 15) return "per 500g";
  if (i === 1) return "per kg";
  return "per pack";
}

async function main() {
  const db = requireSupabase();
  const rows = [];

  for (let i = 0; i < SALTED_FISH_PRODUCTS.length; i++) {
    const item = SALTED_FISH_PRODUCTS[i];
    const title = `${item.name} – One Source`;
    const image = await ensureProductPlaceholder(item.id, title);
    const price = randomPrice(i);
    const hasDeal = i % 4 === 0;

    rows.push(
      seedRowFromJson({
        id: item.id,
        title,
        price,
        originalPrice: hasDeal ? Math.round(price * 1.12) : undefined,
        rating: Number((4.2 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(90 + Math.random() * 1600),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${item.name}. Traditionally salted and dried fish — soak before cooking, then stew, fry, or add to sauces and vegetables. A pantry staple across Uganda and East Africa. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 25 + Math.floor(Math.random() * 100),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed salted fish failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} salted fish products (${CATEGORY_ID}).`);
  console.log("Search: salted fish, mukene, dagaa");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Seed 20 smoked fish products into `fish-and-aquaculture`.
 *
 * Usage:
 *   cd server && npm run seed:smoked-fish
 */
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { ensureProductPlaceholder } from "../lib/placeholderImage.js";

const CATEGORY_ID = "fish-and-aquaculture";

const SMOKED_FISH_PRODUCTS = [
  { id: "smoked-fish-seed-01", name: "Smoked Fish – Tilapia 500g" },
  { id: "smoked-fish-seed-02", name: "Smoked Fish – Nile Perch 1kg" },
  { id: "smoked-fish-seed-03", name: "Smoked Fish – Mackerel pieces" },
  { id: "smoked-fish-seed-04", name: "Smoked Fish – Silver fish (Mukene)" },
  { id: "smoked-fish-seed-05", name: "Smoked Fish – Dagaa" },
  { id: "smoked-fish-seed-06", name: "Smoked Fish – Bulk 2kg" },
  { id: "smoked-fish-seed-07", name: "Smoked Fish – Wood-smoked" },
  { id: "smoked-fish-seed-08", name: "Smoked Fish – Export grade" },
  { id: "smoked-fish-seed-09", name: "Smoked Fish – Premium select" },
  { id: "smoked-fish-seed-10", name: "Smoked Fish – Lake Victoria" },
  { id: "smoked-fish-seed-11", name: "Smoked Fish – Catfish fillets" },
  { id: "smoked-fish-seed-12", name: "Smoked Fish – Whole small" },
  { id: "smoked-fish-seed-13", name: "Smoked Fish – Stew cut" },
  { id: "smoked-fish-seed-14", name: "Smoked Fish – Grade A" },
  { id: "smoked-fish-seed-15", name: "Smoked Fish – Traditional cure" },
  { id: "smoked-fish-seed-16", name: "Smoked Fish – Snack pack" },
  { id: "smoked-fish-seed-17", name: "Smoked Fish – Boneless pieces" },
  { id: "smoked-fish-seed-18", name: "Smoked Fish – Restaurant grade" },
  { id: "smoked-fish-seed-19", name: "Smoked Fish – Ugandan pick" },
  { id: "smoked-fish-seed-20", name: "Smoked Fish – One Source pick" },
];

function randomPrice(i) {
  const base = 9000 + i * 420;
  return Math.round((base + Math.floor(Math.random() * 1300)) / 100) * 100;
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

  for (let i = 0; i < SMOKED_FISH_PRODUCTS.length; i++) {
    const item = SMOKED_FISH_PRODUCTS[i];
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
        rating: Number((4.3 + Math.random() * 0.7).toFixed(1)),
        reviewCount: Math.floor(95 + Math.random() * 1700),
        image,
        category: CATEGORY_ID,
        unit: unitForIndex(i),
        prime: Math.random() > 0.35,
        description: `${item.name}. Traditionally smoked over wood — rich flavour for stews, sauces, and vegetable dishes. Soak lightly if very dry before cooking. Upload your product photo in admin to replace the placeholder.`,
        inStock: true,
        stockQuantity: 20 + Math.floor(Math.random() * 95),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  }

  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed smoked fish failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} smoked fish products (${CATEGORY_ID}).`);
  console.log("Search: smoked fish, mukene, dagaa");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

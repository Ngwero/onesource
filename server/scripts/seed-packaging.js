/**
 * Seed default packaging materials for One Source fulfilment.
 *   cd server && npm run seed:packaging
 */
import { requireSupabase } from "../lib/supabase.js";
import { createPackagingMaterial, listPackagingMaterials } from "../lib/packagingService.js";

const DEFAULTS = [
  {
    id: "cooler-bag-std",
    name: "Insulated cooler bag",
    type: "cooler_bag",
    sku: "PKG-COOL-01",
    stockQuantity: 120,
    reorderLevel: 25,
    unitCost: 8500,
    unit: "each",
    notes: "For chilled produce and fish",
  },
  {
    id: "paper-bag-m",
    name: "Paper grocery bag — medium",
    type: "paper_bag",
    sku: "PKG-PAPER-M",
    stockQuantity: 400,
    reorderLevel: 80,
    unitCost: 500,
    unit: "each",
  },
  {
    id: "paper-bag-l",
    name: "Paper grocery bag — large",
    type: "paper_bag",
    sku: "PKG-PAPER-L",
    stockQuantity: 250,
    reorderLevel: 50,
    unitCost: 800,
    unit: "each",
  },
  {
    id: "plastic-crate",
    name: "Reusable plastic crate",
    type: "crate",
    sku: "PKG-CRATE-01",
    stockQuantity: 80,
    reorderLevel: 15,
    unitCost: 12000,
    unit: "each",
    notes: "Returned crates inspected on receipt",
  },
  {
    id: "cardboard-box-m",
    name: "Cardboard box — medium",
    type: "box",
    sku: "PKG-BOX-M",
    stockQuantity: 150,
    reorderLevel: 30,
    unitCost: 1500,
    unit: "each",
  },
  {
    id: "ice-pack-std",
    name: "Ice pack",
    type: "ice_pack",
    sku: "PKG-ICE-01",
    stockQuantity: 200,
    reorderLevel: 40,
    unitCost: 2000,
    unit: "each",
  },
  {
    id: "produce-wrap",
    name: "Produce cling wrap roll",
    type: "wrap",
    sku: "PKG-WRAP-01",
    stockQuantity: 40,
    reorderLevel: 8,
    unitCost: 9500,
    unit: "roll",
  },
  {
    id: "order-label",
    name: "Order label sticker roll",
    type: "label",
    sku: "PKG-LBL-01",
    stockQuantity: 60,
    reorderLevel: 10,
    unitCost: 7000,
    unit: "roll",
  },
];

async function main() {
  const db = requireSupabase();
  let existing = [];
  try {
    existing = await listPackagingMaterials(db);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const have = new Set(existing.map((m) => m.id));
  let created = 0;
  for (const item of DEFAULTS) {
    if (have.has(item.id)) continue;
    await createPackagingMaterial(db, item);
    created++;
    console.log(`+ ${item.name}`);
  }
  console.log(`Seeded ${created} packaging materials (${existing.length + created} total).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

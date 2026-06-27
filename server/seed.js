import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireSupabase } from "./lib/supabase.js";
import { seedRowFromJson } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "seed-data.json");

async function main() {
  const db = requireSupabase();

  const { count, error: countErr } = await db
    .from("products")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    console.error("Seed failed:", countErr.message);
    console.error(
      "Run server/supabase/schema.sql in your Supabase SQL Editor first."
    );
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.log(`Database already has ${count} products. Skipping seed.`);
    console.log("Delete rows in Supabase Table Editor to re-seed.");
    process.exit(0);
  }

  const products = JSON.parse(readFileSync(seedPath, "utf-8"));
  const rows = products.map(seedRowFromJson);

  const { error } = await db.from("products").insert(rows);
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${products.length} products into Supabase.`);
}

main();

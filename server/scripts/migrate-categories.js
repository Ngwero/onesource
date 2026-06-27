/**
 * One-time migration: map legacy category slugs on existing products to new agricultural slugs.
 * Run: cd server && node scripts/migrate-categories.js
 */
import { requireSupabase } from "../lib/supabase.js";
import { LEGACY_CATEGORY_MAP, normalizeCategoryId } from "../data/categories.js";

async function main() {
  const db = requireSupabase();
  const { data: rows, error } = await db.from("products").select("id, category");

  if (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }

  let updated = 0;
  for (const row of rows ?? []) {
    const next = normalizeCategoryId(row.category);
    if (next === row.category) continue;

    const { error: upErr } = await db
      .from("products")
      .update({ category: next })
      .eq("id", row.id);

    if (upErr) {
      console.error(`Failed ${row.id}:`, upErr.message);
      process.exit(1);
    }
    console.log(`  ${row.id}: ${row.category} → ${next}`);
    updated++;
  }

  console.log(
    `\nDone. Updated ${updated} of ${rows?.length ?? 0} products.` +
      (updated === 0 ? " (already on new categories)" : "")
  );
  console.log("Legacy map:", Object.entries(LEGACY_CATEGORY_MAP).map(([k, v]) => `${k}→${v}`).join(", "));
}

main();

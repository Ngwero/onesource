/**
 * Seed category rows for admin banner images.
 * Run: cd server && node scripts/seed-categories.js
 */
import { requireSupabase } from "../lib/supabase.js";
import { AGRI_CATEGORIES } from "../data/categories.js";

async function main() {
  const db = requireSupabase();
  const rows = AGRI_CATEGORIES.map((c, i) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    category_group: c.group,
    sort_order: i,
    image: null,
    active: true,
  }));

  const { error } = await db.from("categories").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seed categories failed:", error.message);
    console.error("Run server/supabase/categories.sql in Supabase SQL Editor first.");
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} categories. Set banner images in Admin → Category banners.`);
}

main();

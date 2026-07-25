/**
 * Seed / upsert the Kitchen Ware inspiration collage.
 * Requires kitchen_collage table (server/supabase/kitchen-collage.sql).
 *
 *   cd server && npm run seed:kitchen-collage
 */
import "dotenv/config";
import { requireSupabase } from "../lib/supabase.js";
import {
  seedKitchenCollage,
  KITCHEN_COLLAGE_SETUP_HINT,
} from "../lib/kitchenCollageService.js";

async function main() {
  const db = requireSupabase();
  try {
    const collage = await seedKitchenCollage(db);
    console.log("Kitchen collage seeded:", collage.id);
    console.log(`  images: ${collage.images.filter((i) => i.url).length}/5`);
  } catch (err) {
    console.error("Seed failed:", err.message);
    if ((err.message || "").includes("does not exist") || err.code === "PGRST205") {
      console.error(KITCHEN_COLLAGE_SETUP_HINT);
    }
    process.exit(1);
  }
}

main();

/**
 * Restore admin-uploaded blueberry images that were overwritten by seed-blueberries.
 * Uses UUID files already in Supabase Storage (from your Jun 28 uploads).
 *
 *   cd server && node scripts/restore-blueberry-images.js
 */
import { requireSupabase } from "../lib/supabase.js";
import { BLUEBERRY_PRODUCTS } from "../data/blueberriesCatalog.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";

/** Product id → storage object path (your original admin uploads). */
const RESTORE_MAP = {
  "bulk-farm-inputs-002": "products/4699840e-1dcf-4d65-a747-9335d32178c9.webp",
  "bulk-farm-inputs-004": "products/f47702d5-114e-48d3-b03d-59aa0dbc31f1.webp",
  "bulk-farm-inputs-006": "products/f506ae95-4ef0-472f-8464-fa32b27579a8.webp",
  "bulk-farm-inputs-008": "products/4756ade1-0cfd-4879-b18f-88a1c197b830.webp",
  "blueberry-03": "products/7abd812c-066f-4219-b044-e3d2761a2b4f.webp",
  "blueberry-04": "products/1235d748-e1eb-4b0e-9d88-1e2074a29393.webp",
  "blueberry-05": "products/ba01f0fd-6a6d-4ba2-a19b-e12018d4fef6.webp",
  "blueberry-06": "products/7ac86333-6b48-4d20-8fe5-27d2b3c9290b.webp",
  "blueberry-07": "products/e4f13520-c377-4db1-bfab-dce16448f370.webp",
  "blueberry-08": "products/3e39b5ee-d75a-433f-812b-5b3c9f9359f4.webp",
  "blueberry-10": "products/059b2404-629b-4a21-b588-777755c038b9.webp",
  "blueberry-11": "products/2a7f2f0b-6534-4ac8-9190-de377c03a0b3.webp",
  "blueberry-12": "products/dc9d7574-f2cb-408f-be38-592433adc318.webp",
  "blueberry-13": "products/eb1f026b-d6f9-4962-a780-004b358372d6.webp",
  "blueberry-14": "products/5b08b96c-1407-4352-ac99-a36bb05a9585.webp",
  "blueberry-15": "products/f83156dc-1c5e-4958-9bc5-20b89e40da10.webp",
  "blueberry-16": "products/e6d01fb9-e2db-4e73-b4f3-5a9a900149bc.webp",
  "blueberry-17": "products/2424157a-2dab-40fc-a603-dab3825865c5.webp",
};

function publicUrl(db, objectPath) {
  const { data } = db.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function main() {
  const db = requireSupabase();
  let restored = 0;
  let skipped = 0;

  for (const item of BLUEBERRY_PRODUCTS) {
    const objectPath = RESTORE_MAP[item.id];
    if (!objectPath) {
      skipped++;
      continue;
    }

    const { data: existing } = await db
      .from("products")
      .select("image")
      .eq("id", item.id)
      .maybeSingle();

    if (existing?.image?.includes("39f9a7b9")) {
      console.log(`  skip ${item.id} — already has a custom upload`);
      skipped++;
      continue;
    }

    const image = publicUrl(db, objectPath);
    const check = await fetch(image, { method: "HEAD" });
    if (!check.ok) {
      console.warn(`  missing in storage: ${objectPath}`);
      continue;
    }

    const { error } = await db.from("products").update({ image }).eq("id", item.id);
    if (error) throw error;
    console.log(`  restored ${item.id}`);
    restored++;
  }

  console.log(`\nDone. Restored ${restored}, skipped ${skipped}.`);
  console.log("Re-upload any remaining products in admin — uploads now go to Supabase Storage automatically.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

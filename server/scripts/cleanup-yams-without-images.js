/**
 * Delete yam products that have no real image (empty, placeholder, or missing file).
 *
 *   cd server && node scripts/cleanup-yams-without-images.js
 *   cd server && node scripts/cleanup-yams-without-images.js --dry-run
 */
import fs from "fs/promises";
import path from "path";
import { requireSupabase } from "../lib/supabase.js";
import { UPLOADS_ROOT } from "../lib/placeholderImage.js";

const dryRun = process.argv.includes("--dry-run");

function isYamProduct(p) {
  const hay = `${p.id} ${p.title} ${p.description ?? ""}`.toLowerCase();
  return /\byam\b|yams/.test(hay) || p.id.includes("yam");
}

async function hasRealImage(p) {
  const img = (p.image ?? "").trim();
  if (!img) return false;
  if (/placeholders\//i.test(img)) return false;
  if (img.startsWith("http://") || img.startsWith("https://")) return true;
  if (img.startsWith("/uploads/")) {
    const rel = img.replace(/^\/uploads\//, "");
    try {
      await fs.access(path.join(UPLOADS_ROOT, rel));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function main() {
  const db = requireSupabase();
  const { data, error } = await db.from("products").select("id, title, image, description");
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const yams = data.filter(isYamProduct);
  const toDelete = [];
  const toKeep = [];

  for (const p of yams) {
    if (await hasRealImage(p)) toKeep.push(p);
    else toDelete.push(p);
  }

  console.log(`Yam products: ${yams.length} total`);
  console.log(`  Keep (real images): ${toKeep.length}`);
  console.log(`  Delete (no real image): ${toDelete.length}\n`);

  if (toKeep.length) {
    console.log("Keeping:");
    for (const p of toKeep) console.log(`  ${p.id} — ${p.title}`);
    console.log();
  }

  if (!toDelete.length) {
    console.log("Nothing to delete.");
    return;
  }

  console.log(dryRun ? "[dry-run] Would delete:" : "Deleting:");
  for (const p of toDelete) console.log(`  ${p.id} — ${p.image || "(empty)"}`);

  if (dryRun) return;

  const ids = toDelete.map((p) => p.id);
  const BATCH = 50;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error: delErr } = await db.from("products").delete().in("id", chunk);
    if (delErr) {
      console.error("Delete failed:", delErr.message);
      process.exit(1);
    }
  }

  console.log(`\nDeleted ${ids.length} yam product(s) without real images.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

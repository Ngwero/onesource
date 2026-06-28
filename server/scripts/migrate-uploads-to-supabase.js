/**
 * Upload local /uploads files to Supabase Storage and update DB image URLs.
 * Safe for production: only uploads files and updates image columns (no deletes).
 *
 * Run: cd server && node scripts/migrate-uploads-to-supabase.js
 * Dry run: node scripts/migrate-uploads-to-supabase.js --dry-run
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { requireSupabase } from "../lib/supabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";

const dryRun = process.argv.includes("--dry-run");
const skipDbUpdate = process.argv.includes("--skip-db-update");
const CONCURRENCY = 8;

function uploadsPathToObjectPath(uploadsUrl) {
  return uploadsUrl.replace(/^\/uploads\//, "");
}

function publicUrl(db, objectPath) {
  const { data } = db.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function collectRows(db) {
  const rows = [];

  const { data: products, error: pErr } = await db
    .from("products")
    .select("id, image")
    .like("image", "/uploads/%");
  if (pErr) throw pErr;
  for (const row of products ?? []) {
    rows.push({ table: "products", id: row.id, image: row.image });
  }

  const { data: hero, error: hErr } = await db
    .from("hero_slides")
    .select("id, image")
    .like("image", "/uploads/%");
  if (hErr && !hErr.message.includes("does not exist")) throw hErr;
  for (const row of hero ?? []) {
    rows.push({ table: "hero_slides", id: row.id, image: row.image });
  }

  const { data: categories, error: cErr } = await db
    .from("categories")
    .select("id, image")
    .like("image", "/uploads/%");
  if (cErr && !cErr.message.includes("does not exist")) throw cErr;
  for (const row of categories ?? []) {
    rows.push({ table: "categories", id: row.id, image: row.image });
  }

  return rows;
}

async function uploadFile(db, objectPath, localPath) {
  const buffer = await fs.readFile(localPath);
  const { error } = await db.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
  return publicUrl(db, objectPath);
}

async function runPool(items, worker) {
  let index = 0;
  async function next() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => next()));
}

async function main() {
  const db = requireSupabase();
  const rows = await collectRows(db);
  const uniquePaths = [...new Set(rows.map((r) => r.image))];

  console.log(
    `Found ${rows.length} DB rows across ${uniquePaths.length} unique /uploads paths` +
      (dryRun ? " (dry run)" : "")
  );

  const pathToUrl = new Map();
  let uploaded = 0;
  let skipped = 0;
  let missing = 0;

  await runPool(uniquePaths, async (uploadsUrl) => {
    const objectPath = uploadsPathToObjectPath(uploadsUrl);
    const localPath = path.join(UPLOADS_ROOT, objectPath);

    try {
      await fs.access(localPath);
    } catch {
      missing++;
      console.warn(`  missing file: ${localPath}`);
      return;
    }

    if (dryRun) {
      pathToUrl.set(uploadsUrl, publicUrl(db, objectPath));
      uploaded++;
      return;
    }

    try {
      const url = await uploadFile(db, objectPath, localPath);
      pathToUrl.set(uploadsUrl, url);
      uploaded++;
      if (uploaded % 50 === 0) {
        console.log(`  uploaded ${uploaded}/${uniquePaths.length}…`);
      }
    } catch (e) {
      console.error(`  failed ${objectPath}:`, e.message);
      throw e;
    }
  });

  console.log(`Uploads: ${uploaded} ok, ${missing} missing local files, ${skipped} skipped`);

  if (skipDbUpdate || dryRun) {
    console.log(skipDbUpdate ? "Skipping DB updates (--skip-db-update)" : "Dry run — no DB updates");
    return;
  }

  let updated = 0;
  for (const row of rows) {
    const nextUrl = pathToUrl.get(row.image);
    if (!nextUrl || nextUrl === row.image) continue;

    const { error } = await db.from(row.table).update({ image: nextUrl }).eq("id", row.id);
    if (error) throw error;
    updated++;
  }

  console.log(`Updated ${updated} DB rows with Supabase Storage URLs`);
  console.log("Set USE_SUPABASE_STORAGE=true on Railway for new uploads.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

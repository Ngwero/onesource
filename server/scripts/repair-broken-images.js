/**
 * Find products whose image URLs are broken (404 / unreachable) and replace
 * them with local WebP placeholders. Uploads to Supabase Storage when enabled.
 *
 *   cd server && npm run repair:images
 *   cd server && npm run repair:images -- --dry-run
 */
import { requireSupabase } from "../lib/supabase.js";
import { ensureProductPlaceholder, UPLOADS_ROOT } from "../lib/placeholderImage.js";
import { useSupabaseStorage } from "../lib/env.js";
import fs from "fs/promises";
import path from "path";

const dryRun = process.argv.includes("--dry-run");
const CONCURRENCY = 12;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";

async function fetchAllProducts(db) {
  const PAGE = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("id, title, image")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function imageOk(url) {
  if (!url?.trim()) return false;
  const checkUrl = url.startsWith("http")
    ? url
    : `http://127.0.0.1:${process.env.PORT || 3001}${url}`;
  try {
    const res = await fetch(checkUrl, { method: "HEAD", redirect: "follow" });
    if (res.ok) return true;
    // Some CDNs reject HEAD — try GET range
    const get = await fetch(checkUrl, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

async function publishPlaceholder(db, productId, title) {
  const localUrl = await ensureProductPlaceholder(productId, title);
  const relative = localUrl.replace(/^\/uploads\//, "");
  const localPath = path.join(UPLOADS_ROOT, relative);

  if (!useSupabaseStorage()) {
    return localUrl;
  }

  const buffer = await fs.readFile(localPath);
  const objectPath = relative;
  const { error } = await db.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
  const { data } = db.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
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
  const products = await fetchAllProducts(db);
  console.log(`Checking ${products.length} product images…`);

  const broken = [];
  await runPool(products, async (p) => {
    const ok = await imageOk(p.image);
    if (!ok) broken.push(p);
  });

  console.log(`Broken / missing: ${broken.length}`);
  if (!broken.length) {
    console.log("All product images look healthy.");
    return;
  }

  for (const p of broken.slice(0, 20)) {
    console.log(`  • ${p.id} — ${p.title}`);
    console.log(`    was: ${p.image}`);
  }
  if (broken.length > 20) console.log(`  … and ${broken.length - 20} more`);

  if (dryRun) {
    console.log("Dry run — no changes written.");
    return;
  }

  let fixed = 0;
  for (const p of broken) {
    try {
      const image = await publishPlaceholder(db, p.id, p.title || p.id);
      const { error } = await db.from("products").update({ image }).eq("id", p.id);
      if (error) throw error;
      fixed++;
      console.log(`  fixed ${p.id} → ${image}`);
    } catch (e) {
      console.error(`  failed ${p.id}: ${e.message}`);
    }
  }

  console.log(`\nRepaired ${fixed}/${broken.length} product images.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

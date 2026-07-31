/**
 * Re-upload Cookwarestore product images that return 400 / missing in storage.
 *
 * Usage:
 *   cd server && npm run repair:cookwarestore-images
 *   cd server && npm run repair:cookwarestore-images -- --dry-run
 *   cd server && npm run repair:cookwarestore-images -- --concurrency 6
 *   cd server && npm run repair:cookwarestore-images -- --limit 50
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_ROOT =
  process.env.COOKWARESTORE_CATALOG?.trim() ||
  "/Users/user/kitchen ware/Cookwarestore_UK";

const dryRun = process.argv.includes("--dry-run");
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 6));
const CHECK_CONCURRENCY = Math.max(1, Number(flagValue("--check-concurrency") || 24));
const limitArg = Number(flagValue("--limit") || 0);
const FILE_RE = /^(.+)_(\d+)\.webp$/i;

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

async function withRetries(fn, { attempts = 4, label = "op" } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = Math.min(8000, 400 * 2 ** (i - 1));
      console.warn(
        `  retry ${i}/${attempts} ${label}: ${err.message} (wait ${delay}ms)`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function walkWebpFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith(".webp")) continue;
      if (/banner/i.test(entry.name)) continue;
      out.push(abs);
    }
  }
  await walk(rootDir);
  return out;
}

/** articleId → absolute local path (first win) */
async function buildLocalIndex() {
  const files = await walkWebpFiles(CATALOG_ROOT);
  const byArticle = new Map();
  for (const absolutePath of files) {
    const m = path.basename(absolutePath).match(FILE_RE);
    if (!m) continue;
    const articleId = m[2];
    if (!byArticle.has(articleId)) byArticle.set(articleId, absolutePath);
  }
  return byArticle;
}

function parseProductId(id) {
  const m = String(id).match(/^kitchen-(.+)-cws(\d+)$/i);
  if (!m) return null;
  return { aisleId: m[1], articleId: m[2] };
}

function storageObjectPath(aisleId, articleId) {
  return `products/kitchen-ware/${aisleId}/cws-${articleId}.webp`;
}

async function loadCwsProducts(db) {
  const rows = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("id,image")
      .like("id", "%-cws%")
      .range(from, from + page - 1);
    if (error) throw error;
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < page) break;
    from += page;
  }
  return rows;
}

async function imageLooksBroken(url) {
  if (!url || !String(url).trim()) return true;
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return true;
    const len = Number(res.headers.get("content-length") || 0);
    if (len > 0 && len < 500) return true;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type && !type.includes("image") && !type.includes("octet-stream")) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function runPool(items, concurrency, worker) {
  let index = 0;
  let done = 0;
  const total = items.length;
  const errors = [];

  async function next() {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      try {
        await worker(item, i);
      } catch (err) {
        errors.push({ id: item.id ?? String(i), message: err.message });
        console.error(`  ✗ ${item.id ?? i}: ${err.message}`);
      }
      done += 1;
      if (done % 50 === 0 || done === total) {
        console.log(`  … ${done}/${total}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, () =>
      next()
    )
  );
  return errors;
}

async function uploadAndUpdate(db, product, localPath) {
  const parsed = parseProductId(product.id);
  if (!parsed) throw new Error("bad product id");

  const input = await fs.readFile(localPath);
  const optimized = await sharp(input)
    .rotate()
    .resize({
      width: 1200,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  const objectPath = storageObjectPath(parsed.aisleId, parsed.articleId);
  await withRetries(
    async () => {
      const { error } = await db.storage.from(BUCKET).upload(objectPath, optimized, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
      if (error) throw error;
    },
    { label: `upload ${product.id}` }
  );

  const image = db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
  const { error } = await db
    .from("products")
    .update({ image })
    .eq("id", product.id);
  if (error) throw error;
  return image;
}

async function main() {
  console.log(`Catalog: ${CATALOG_ROOT}`);
  console.log(
    `Mode: ${dryRun ? "dry-run" : "repair"} | check×${CHECK_CONCURRENCY} upload×${CONCURRENCY}`
  );

  const localByArticle = await buildLocalIndex();
  console.log(`Local articles indexed: ${localByArticle.size}`);

  const db = requireSupabase();
  const products = await loadCwsProducts(db);
  console.log(`DB cookwarestore products: ${products.length}`);

  const broken = [];
  let checked = 0;
  await runPool(products, CHECK_CONCURRENCY, async (product) => {
    const bad = await imageLooksBroken(product.image);
    checked += 1;
    if (bad) broken.push(product);
    if (checked % 200 === 0) {
      console.log(`  checked ${checked}/${products.length} (broken so far ${broken.length})`);
    }
  });

  console.log(`Broken / missing images: ${broken.length}`);
  const toFix = limitArg > 0 ? broken.slice(0, limitArg) : broken;

  let missingLocal = 0;
  const repairable = [];
  for (const product of toFix) {
    const parsed = parseProductId(product.id);
    if (!parsed) continue;
    const localPath = localByArticle.get(parsed.articleId);
    if (!localPath) {
      missingLocal += 1;
      continue;
    }
    repairable.push({ ...product, localPath, articleId: parsed.articleId });
  }

  console.log(
    `Repairable: ${repairable.length} | no local file: ${missingLocal}`
  );
  if (dryRun) {
    for (const p of repairable.slice(0, 15)) {
      console.log(`  would fix ${p.id} ← ${path.basename(p.localPath)}`);
    }
    return;
  }

  const errors = await runPool(repairable, CONCURRENCY, async (item) => {
    await uploadAndUpdate(db, item, item.localPath);
  });

  console.log("\nDone.");
  console.log(`  repaired: ${repairable.length - errors.length}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Cookwarestore image repair failed:", err.message);
  process.exit(1);
});

/**
 * Import the local PharmaMarket catalogue (products.jsonl + 3-images/) into the
 * Pharmacy shop. Does not fetch product pages. Cover images are the local files
 * when the folder has them, otherwise the image URL already stored in the JSON
 * (downloaded as a file and uploaded to Supabase storage).
 *
 * Source (default): /Users/user/pharmamarket-products
 *
 *   cd server && node scripts/import-pharmamarket-folder.js --dry-run
 *   cd server && node scripts/import-pharmamarket-folder.js
 *
 * Product id: pharmacy-{aisleId}-pm-{sku}
 * Out of stock at the supplier is still listed (details.sourcing).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { pharmacyAisleForCategory } from "../lib/pharmacyClassify.js";
import { isHighQualityPharmacyImage } from "../lib/pharmacyImageQuality.js";
import { pharmacyShelfPrice, pharmacyWasPrice } from "../lib/pharmacyPrices.js";

const ROOT = process.env.PHARMA_FOLDER?.trim() || "/Users/user/pharmamarket-products";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const HOME = path.join(os.homedir(), "onesource-details");
const CATEGORY_ID = "pharmacy";
const UPSERT_CHUNK = 200;

const dryRun = process.argv.includes("--dry-run");
const limitArg = Number(flagValue("--limit") || 0);
const aisleArg = flagValue("--aisle");
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 10));

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function cleanText(text) {
  return String(text ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(row) {
  return cleanText(row.name).replace(/\s*\|\s*/g, " ").replace(/\s*[-–]\s*$/, "").trim();
}

function unitFromTitle(title) {
  const m = title.match(/(\d+(?:[.,]\d+)?)\s?(ml|g|kg|l|mg)\b/i);
  if (!m) return "each";
  return `${m[1].replace(",", ".")}${m[2].toLowerCase()}`;
}

async function loadRows() {
  const rows = [];
  const stream = fs.createReadStream(path.join(ROOT, "products.jsonl"), "utf8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    rows.push(JSON.parse(trimmed));
  }
  return rows;
}

/** sku → sorted local image paths (only the products saved under 3-images/). */
function localImagesBySku() {
  const dir = path.join(ROOT, "3-images");
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const name of fs.readdirSync(dir)) {
    const folder = path.join(dir, name);
    if (!fs.statSync(folder).isDirectory()) continue;
    const sku = name.match(/\[([^\]]+)\]$/)?.[1];
    if (!sku) continue;
    const images = fs
      .readdirSync(folder)
      .filter((file) => /\.(jpe?g|png|webp|gif)$/i.test(file))
      .sort()
      .map((file) => path.join(folder, file));
    if (images.length) map.set(sku, images);
  }
  return map;
}

function planItems(rows, localImages) {
  const skipped = {};
  const skip = (reason, row) => {
    skipped[reason] = skipped[reason] ?? { count: 0, examples: [] };
    skipped[reason].count += 1;
    if (skipped[reason].examples.length < 6) skipped[reason].examples.push(`${row.sku} ${row.name}`);
  };
  const items = [];
  const seen = new Set();
  for (const row of rows) {
    const sku = cleanText(row.sku);
    const title = titleOf(row);
    const eur = Number(row.price);
    const regular = Number(row.regular_price);
    if (!sku || !title) {
      skip("no-title", row);
      continue;
    }
    if (seen.has(sku)) {
      skip("duplicate-sku", row);
      continue;
    }
    const priced = pharmacyShelfPrice(eur);
    if (!priced) {
      skip("no-price", row);
      continue;
    }
    const aisleId = pharmacyAisleForCategory(row.category);
    if (aisleArg && aisleId !== aisleArg) continue;
    seen.add(sku);
    const brand = cleanText(row.brand);
    items.push({
      id: `pharmacy-${aisleId}-pm-${sku}`,
      sku,
      aisleId,
      title,
      brand: brand && brand.toLowerCase() !== "no brand" ? brand : "",
      categoryPath: cleanText(row.category),
      eur,
      price: priced.price,
      originalPrice: pharmacyWasPrice(priced.price, eur, regular),
      outOfStock: cleanText(row.stock).toLowerCase() !== "in stock",
      // Supplier listing URLs point at 146px cached thumbnails. Import the original.
      imageUrl: cleanText(row.image).replace(
        /^(https:\/\/www\.pharmamarket\.eu\/media\/catalog\/product)\/cache\/[^/]+\//,
        "$1/"
      ),
      url: cleanText(row.url),
      localPaths: localImages.get(sku) ?? [],
    });
  }
  return { items, skipped };
}

function descriptionFor(item) {
  const named =
    item.brand && !item.title.toLowerCase().startsWith(item.brand.toLowerCase())
      ? `${item.brand} ${item.title}`
      : item.title;
  return `${named}. ${item.categoryPath}.`;
}

function productRow(item, image, extraImages) {
  const h = hashStr(item.id);
  const details = {
    source: "listing",
    ...(item.imageQuality ? { pharmacyImageQuality: item.imageQuality } : {}),
    ...(item.brand ? { brand: item.brand } : {}),
    specs: [
      { key: "sku", label: "SKU", value: item.sku },
      { key: "category", label: "Category", value: item.categoryPath },
    ],
    ...(item.url ? { sourceUrl: item.url } : {}),
    ...(extraImages.length > 1 ? { images: extraImages } : {}),
    ...(item.outOfStock ? { sourcing: "supplier-out-of-stock" } : {}),
  };
  return seedRowFromJson({
    id: item.id,
    title: `${item.title} – One Source`,
    price: item.price,
    originalPrice: item.originalPrice,
    rating: Number((4.2 + (h % 8) * 0.1).toFixed(1)),
    reviewCount: 6 + (h % 150),
    image,
    category: CATEGORY_ID,
    unit: unitFromTitle(item.title),
    prime: true,
    description: descriptionFor(item),
    inStock: true,
    stockQuantity: item.outOfStock ? 8 : 15,
    delivery: "FREE same-day delivery on orders over USh 100,000",
    details,
    published: true,
  });
}

async function withRetries(fn, label, attempts = 4) {
  for (let i = 1; ; i += 1) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      console.warn(`  retry ${i}/${attempts} ${label}: ${err.message}`);
      await new Promise((r) => setTimeout(r, Math.min(8000, 500 * 2 ** (i - 1))));
    }
  }
}

function hostedPharmacyImage(url) {
  return (
    typeof url === "string" &&
    url.includes("/storage/v1/object/public/images/products/pharmacy/")
  );
}

/** Same listing the importer would write, so a rerun can skip it. */
function rowUnchanged(existing, item) {
  if (!hostedPharmacyImage(existing.image)) return false;
  const extra = Array.isArray(existing.details?.images) ? existing.details.images : [];
  const row = productRow(item, existing.image, extra);
  const wantSourcing = item.outOfStock ? "supplier-out-of-stock" : undefined;
  if ((existing.details?.sourcing || undefined) !== wantSourcing) return false;
  return (
    existing.title === row.title &&
    Number(existing.price) === row.price &&
    (existing.original_price ?? null) === (row.original_price ?? null) &&
    existing.description === row.description &&
    existing.category === CATEGORY_ID &&
    existing.in_stock !== false &&
    Number(existing.stock_quantity) === row.stock_quantity &&
    existing.published !== false
  );
}

/** Primary-key range. `like 'pharmacy-%'` times out once the table is large. */
async function fetchPharmacyRows(db) {
  const rows = [];
  let last = "pharmacy-";
  const select =
    "id,title,price,original_price,image,category,description,in_stock,stock_quantity,details,published";
  for (;;) {
    const data = await withRetries(
      async () => {
        const res = await db
          .from("products")
          .select(select)
          .gte("id", last)
          .lt("id", "pharmacy.")
          .order("id")
          .limit(500);
        if (res.error) throw res.error;
        return res.data ?? [];
      },
      `read pharmacy rows after ${last}`,
      6
    );
    const page = rows.length ? data.filter((row) => row.id !== last) : data;
    if (!page.length) break;
    rows.push(...page.filter((row) => String(row.id).startsWith("pharmacy-")));
    last = page[page.length - 1].id;
    if (data.length < 500) break;
  }
  return rows;
}

async function ensureCategory(db) {
  const { error } = await db.from("categories").upsert(
    {
      id: CATEGORY_ID,
      name: "Pharmacy",
      icon: "💊",
      category_group: "specialty",
      sort_order: 16,
      active: true,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function uploadBuffer(db, item, buf, index) {
  const optimized = await sharp(buf)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  if (index === 0) {
    const { width, height } = await sharp(optimized).metadata();
    item.imageQuality = isHighQualityPharmacyImage({ width, height })
      ? { status: "verified", width, height }
      : undefined;
  }
  const suffix = index === 0 ? "" : `-${index + 1}`;
  const objectPath = `products/pharmacy/${item.aisleId}/pm-${item.sku}${suffix}.webp`;
  await withRetries(async () => {
    const { error } = await db.storage.from(BUCKET).upload(objectPath, optimized, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw error;
  }, `upload ${item.sku}${suffix}`);
  return db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

async function readRemote(url) {
  const res = await fetch(url, {
    headers: { Accept: "image/*,*/*" },
    signal: AbortSignal.timeout(45000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error(`not an image (${type || "no type"})`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadImages(db, item) {
  const urls = [];
  if (item.localPaths.length) {
    for (let i = 0; i < item.localPaths.length; i += 1) {
      urls.push(await uploadBuffer(db, item, fs.readFileSync(item.localPaths[i]), i));
    }
    return { urls, hosted: true, fromLocal: true };
  }
  if (!item.imageUrl) return { urls: [], hosted: false, fromLocal: false };
  try {
    const buf = await withRetries(() => readRemote(item.imageUrl), `fetch ${item.sku}`, 3);
    urls.push(await uploadBuffer(db, item, buf, 0));
    return { urls, hosted: true, fromLocal: false };
  } catch (err) {
    return { urls: [item.imageUrl], hosted: false, fromLocal: false, error: err.message };
  }
}

async function upsertRows(db, rows) {
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    await withRetries(async () => {
      const { error } = await db.from("products").upsert(chunk, { onConflict: "id" });
      if (error) throw error;
    }, `upsert ${i}`, 6);
  }
}

async function main() {
  console.log(`Folder: ${ROOT}`);
  console.log(
    `Mode: ${dryRun ? "dry-run" : "import"} | concurrency=${CONCURRENCY}` +
      (limitArg ? ` | limit=${limitArg}` : "") +
      (aisleArg ? ` | aisle=${aisleArg}` : "")
  );

  const rows = await loadRows();
  const localImages = localImagesBySku();
  const { items: all, skipped } = planItems(rows, localImages);
  const items = limitArg > 0 ? all.slice(0, limitArg) : all;
  const prices = items.map((i) => i.price);
  const byAisle = {};
  let localCovers = 0;
  let oos = 0;
  for (const item of items) {
    byAisle[item.aisleId] = (byAisle[item.aisleId] ?? 0) + 1;
    if (item.localPaths.length) localCovers += 1;
    if (item.outOfStock) oos += 1;
  }
  console.log(`JSONL rows: ${rows.length} → importable: ${all.length}${limitArg ? ` (limit ${items.length})` : ""}`);
  console.log(`Local image folders matched: ${localCovers} | supplier out of stock (still imported): ${oos}`);
  console.log(
    `Price range UGX: ${prices.length ? Math.min(...prices) : "—"} – ${prices.length ? Math.max(...prices) : "—"}`
  );
  console.log("By aisle:");
  for (const [aisle, n] of Object.entries(byAisle).sort((a, b) => b[1] - a[1])) console.log(`  • ${aisle}: ${n}`);
  if (Object.keys(skipped).length) {
    console.log("Skipped:");
    for (const [reason, s] of Object.entries(skipped)) console.log(`  • ${reason}: ${s.count}`);
  }

  if (dryRun) {
    for (const item of items.filter((_, n) => n % 4000 === 0).slice(0, 8)) {
      console.log(`  ${item.aisleId.padEnd(14)} €${String(item.eur).padEnd(8)} USh ${String(item.price).padStart(10)}  ${item.title}`);
    }
    return;
  }

  const db = requireSupabase();
  const existing = await fetchPharmacyRows(db);
  const existingById = new Map(existing.map((row) => [row.id, row]));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(HOME, "backups", `pharmamarket-import-${stamp}.json`);
  fs.mkdirSync(path.dirname(backupFile), { recursive: true });

  const reuseImage = [];
  const needImages = [];
  let alreadyPresent = 0;
  for (const item of items) {
    const prev = existingById.get(item.id);
    if (!prev) {
      needImages.push(item);
      continue;
    }
    if (rowUnchanged(prev, item)) {
      alreadyPresent += 1;
      continue;
    }
    if (hostedPharmacyImage(prev.image)) {
      const extra = Array.isArray(prev.details?.images) ? prev.details.images : [];
      reuseImage.push(productRow({ ...item, imageQuality: prev.details?.pharmacyImageQuality }, prev.image, extra));
    } else {
      needImages.push(item);
    }
  }
  const overwritten = [...reuseImage, ...needImages]
    .map((row) => existingById.get(row.id))
    .filter(Boolean);
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      {
        source: ROOT,
        createdAt: stamp,
        planned: items.length,
        alreadyPresent,
        overwritten,
      },
      null,
      1
    )
  );
  console.log(
    `Already in Supabase: ${existing.length} | unchanged: ${alreadyPresent} | ` +
      `metadata updates: ${reuseImage.length} | need images: ${needImages.length}`
  );
  console.log(`Backup → ${backupFile} (${overwritten.length} pharmacy rows that will be overwritten)`);

  await ensureCategory(db);
  if (reuseImage.length) {
    await upsertRows(db, reuseImage);
    console.log(`Updated ${reuseImage.length} existing rows (kept hosted images)`);
  }

  let done = 0;
  let index = 0;
  const errors = [];
  let hosted = 0;
  let hotlinked = 0;
  let fromLocal = 0;
  let pending = [];
  let flushChain = Promise.resolve();
  const work = needImages;

  function queueFlush(force = false) {
    if (!force && pending.length < UPSERT_CHUNK) return flushChain;
    if (!pending.length) return flushChain;
    const chunk = pending;
    pending = [];
    flushChain = flushChain.then(() => upsertRows(db, chunk));
    return flushChain;
  }

  async function worker() {
    while (index < work.length) {
      const item = work[index++];
      try {
        const images = await uploadImages(db, item);
        if (images.hosted) hosted += 1;
        else hotlinked += 1;
        if (images.fromLocal) fromLocal += 1;
        if (!images.urls[0]) throw new Error("no image");
        pending.push(productRow(item, images.urls[0], images.urls));
        if (!images.hosted && images.error) {
          errors.push(`${item.id}: image ${images.error} (kept source URL)`);
        }
      } catch (err) {
        errors.push(`${item.id}: ${err.message}`);
        console.error(`  ✗ ${item.id}: ${err.message}`);
      }
      done += 1;
      await queueFlush();
      if (done % 250 === 0 || done === work.length) {
        console.log(`  … ${done}/${work.length} hosted=${hosted} hotlinked=${hotlinked}`);
      }
    }
  }

  if (work.length) {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, work.length) }, worker));
  }
  await queueFlush(true);
  await flushChain;

  const hardFailIds = new Set(
    errors.filter((e) => !e.includes("kept source URL")).map((e) => e.split(":")[0])
  );
  const inserted = needImages.filter((item) => !existingById.has(item.id) && !hardFailIds.has(item.id)).length;
  const updated =
    reuseImage.length +
    needImages.filter((item) => existingById.has(item.id) && !hardFailIds.has(item.id)).length;
  const summary = {
    folderRows: rows.length,
    importable: all.length,
    alreadyPresent,
    updated,
    inserted,
    imageWork: needImages.length,
    hosted,
    hotlinked,
    fromLocal,
    failed: errors.filter((e) => !e.includes("kept source URL")).length,
    imageWarnings: errors.filter((e) => e.includes("kept source URL")).length,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    byAisle,
    backupFile,
  };
  const summaryFile = path.join(HOME, "backups", `pharmamarket-import-${stamp}-summary.json`);
  fs.writeFileSync(summaryFile, JSON.stringify({ summary, errors: errors.slice(0, 200) }, null, 1));
  console.log("\nDone.");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Summary → ${summaryFile}`);
  if (summary.failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error("PharmaMarket import failed:", err);
  process.exit(1);
});

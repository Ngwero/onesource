/**
 * Import the full Lookfantastic catalogue crawl (products.json + images/{id}.jpg)
 * into the Cosmetics shop aisles.
 *
 * Source (default): /Users/user/lookfantastic-products/all-products
 *
 * Usage:
 *   cd server && npm run import:lookfantastic-folder -- --dry-run
 *   cd server && npm run import:lookfantastic-folder -- --limit 50
 *   cd server && npm run import:lookfantastic-folder -- --aisle lips
 *
 * Aisles come from server/lib/cosmeticsClassify.js; non-core groups (supplements,
 * home fragrance, sexual wellness, home items, beauty boxes) get their own aisles.
 * Out-of-stock products are imported too and flagged details.sourcing =
 * "supplier-out-of-stock" (internal; not shown to shoppers).
 *
 * Skips items without a photo or price, unusable titles, Lookfantastic gift cards /
 * vouchers (store credit for lookfantastic.com), Lookfantastic ids already listed
 * (any variant sku), same-name duplicates, and products already listed from Boots
 * (server/lib/cosmeticsMatch.js + ~/onesource-details/lf/_matches.json).
 *
 * Product information: cosmeticsProductDetails() with the cached manufacturer page
 * (~/onesource-details/lf/{id}.json) when present, otherwise the crawl description.
 * Everything is published; incomplete items are flagged in details.hiddenReason.
 *
 * Price: gbpToUgandanCosmeticsPrice. Product id: cosmetics-{aisleId}-lf-{productId}
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { gbpToUgandanCosmeticsPrice } from "../lib/cosmeticsPrices.js";
import { cosmeticsProductDetails } from "../lib/cosmeticsProductInfo.js";
import { brandKey, matchLf, sizeOf, tokens, normText } from "../lib/cosmeticsMatch.js";
import { classifyCosmetic } from "../lib/cosmeticsClassify.js";
import { productIdWithoutAisle } from "../lib/aisles.js";

const ROOT = process.env.LF_FOLDER?.trim() || "/Users/user/lookfantastic-products/all-products";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const HOME = path.join(os.homedir(), "onesource-details");
const LF_DIR = path.join(HOME, "lf");
const COSMETICS_CATEGORY_ID = "cosmetics";
const UPSERT_CHUNK = 200;

const dryRun = process.argv.includes("--dry-run");
const limitArg = Number(flagValue("--limit") || 0);
const aisleArg = flagValue("--aisle");
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 8));

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
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[™®]/g, "")
    .replace(/\s*-?\s*LOOKFANTASTIC EXCLUSIVE\b/gi, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * The crawl cuts some names at a hyphen ("PIXI On-the", "benefit Dew-la"); the last
 * breadcrumb still has the full name. Also drops dangling " -" endings.
 */
function fullName(p) {
  const name = cleanText(p.name);
  const last = cleanText(String(p.breadcrumb || "").split(" > ").pop());
  const restored = last.length > name.length && last.toLowerCase().startsWith(name.toLowerCase()) ? last : name;
  return restored.replace(/\s*[-–]\s*$/, "").trim();
}

/** Empty, brand-only or one-word names can't be shown as a product title. */
function unusableTitle(title, brand) {
  const rest = title.toLowerCase().replace(brand.toLowerCase(), "").replace(/[^a-z0-9]+/g, " ").trim();
  return !title || title.split(/\s+/).length < 2 || rest.length < 3;
}

function unitFromTitle(title) {
  const m = title.match(/(\d+(?:[.,]\d+)?)\s?(ml|g|kg|l)\b/i);
  if (!m) return "each";
  const amount = Number(m[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1500) return "each";
  return `${m[1].replace(",", ".")}${m[2].toLowerCase()}`;
}

/** Splits "Directions of use:" / "Ingredients:" out of a crawl description. */
function crawlSections(description) {
  const text = cleanText(description);
  const sections = {};
  let body = text;
  const ing = body.match(/(?<!key )(?:full )?ingredients(?: list)?\s*:\s*([\s\S]+)$/i);
  if (ing && (ing[1].match(/,/g) || []).length >= 4) {
    sections["Full Ingredients List"] = ing[1].trim();
    body = body.slice(0, ing.index).trim();
  }
  const how = body.match(/(?:how to use|directions(?: of use| for use)?|application)\s*:\s*([\s\S]+)$/i);
  if (how && how[1].trim().length > 15) {
    sections["How to Use"] = how[1].trim();
    body = body.slice(0, how.index).trim();
  }
  return { description: body, sections };
}

function loadCrawl() {
  const products = JSON.parse(fs.readFileSync(path.join(ROOT, "products.json"), "utf8"));
  const images = new Set(fs.readdirSync(path.join(ROOT, "images")));
  return { products, images };
}

async function fetchAll(db, select, filter) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from("products").select(select).order("id").range(from, from + 999));
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

function bootsBrand(row) {
  return row.details?.brand || (row.description || "").match(/Authentic (.+?) (?:[a-z]|from)/)?.[1] || "";
}

/** Folder ids that duplicate a listed Boots/other product (strict title + brand + size match). */
function listedDuplicates(existingRows, candidates) {
  const byBrand = new Map();
  for (const c of candidates) {
    const key = brandKey(c.brand);
    const entry = { id: c.productId, name: normText(c.title), tokens: new Set(tokens(c.title)), size: sizeOf(c.title) };
    byBrand.set(key, [...(byBrand.get(key) ?? []), entry]);
  }
  const dup = new Map();
  for (const row of existingRows) {
    if (/-lf-/.test(row.id)) continue;
    const brand = bootsBrand(row);
    const pool = byBrand.get(brandKey(brand));
    if (!brand || !pool) continue;
    const hit = matchLf(row.title, brand, pool);
    if (hit?.exact) dup.set(hit.id, row.id);
  }
  return dup;
}

function planItems({ products, images }, existingLf, matchedLf) {
  const skipped = {};
  const skip = (reason, p) => {
    skipped[reason] = skipped[reason] ?? { count: 0, examples: [] };
    skipped[reason].count += 1;
    if (skipped[reason].examples.length < 6) skipped[reason].examples.push(`${p.id} ${p.name}`);
  };
  const nameKeyOf = (p) => `${brandKey(p.brand)}|${normText(fullName(p))}`;
  const skusOf = (p) => [String(p.id), ...(p.variants ?? []).map((v) => String(v.sku))];
  const outOfStock = (p) => {
    const own = p.variants?.find((v) => String(v.sku) === String(p.id));
    return !p.in_stock || Boolean(own?.availability && own.availability !== "InStock");
  };
  // Names already on sale count as seen, so a same-name sibling isn't imported on a re-run.
  const seenNames = new Set(
    products.filter((p) => skusOf(p).some((s) => existingLf.has(s) || matchedLf.has(s))).map(nameKeyOf)
  );
  // In-stock first, so a same-name in-stock sibling wins over an out-of-stock one.
  const ordered = [...products].sort((a, b) => Number(outOfStock(a)) - Number(outOfStock(b)));
  const items = [];
  for (const p of ordered) {
    const title = fullName(p);
    const brand = cleanText(p.brand);
    const own = p.variants?.find((v) => String(v.sku) === String(p.id));
    const gbp = Number(own?.price ?? p.price_min);
    const oos = outOfStock(p);
    if (!images.has(`${p.id}.jpg`)) { skip("no-image", p); continue; }
    if (!(gbp > 0)) { skip("no-price", p); continue; }
    if (unusableTitle(title, brand)) { skip("unusable-title", p); continue; }
    const skus = skusOf(p);
    if (skus.some((s) => existingLf.has(s))) { skip("already-listed-lf", p); continue; }
    if (skus.some((s) => matchedLf.has(s))) { skip("already-listed-boots", p); continue; }
    const nameKey = nameKeyOf(p);
    if (seenNames.has(nameKey)) { skip("duplicate-in-folder", p); continue; }
    const c = classifyCosmetic(title, p.breadcrumb || "");
    if (c.skip) { skip(c.skip, p); continue; }
    if (aisleArg && c.aisle !== aisleArg) continue;
    seenNames.add(nameKey);

    const price = gbpToUgandanCosmeticsPrice(gbp);
    const worthGbp = Number(title.match(/worth (?:over )?£([\d,.]+)/i)?.[1]?.replace(/,/g, ""));
    const was = Number.isFinite(worthGbp) && worthGbp > gbp ? gbpToUgandanCosmeticsPrice(worthGbp) : null;
    items.push({
      id: `cosmetics-${c.aisle}-lf-${p.id}`,
      productId: String(p.id),
      aisleId: c.aisle,
      group: c.group ?? null,
      outOfStock: oos,
      titleRestored: title !== cleanText(p.name),
      title,
      brand,
      gbp,
      price,
      originalPrice: was && was > price ? was : null,
      rating: p.rating ? Number(Math.min(5, p.rating).toFixed(1)) : null,
      reviewCount: Number(p.review_count) || null,
      description: p.description || "",
      localPath: path.join(ROOT, "images", `${p.id}.jpg`),
    });
  }
  return { items, skipped };
}

function productInfo(item) {
  const cacheFile = path.join(LF_DIR, `${item.productId}.json`);
  let lf = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : null;
  if (!lf || lf.gone) {
    const { description, sections } = crawlSections(item.description);
    lf = { name: item.title, brand: item.brand, description, sections };
  }
  const info = cosmeticsProductDetails({ title: item.title, brand: item.brand, lf });
  const hidden = info.complete ? [] : [info.reason];
  return {
    description: info.description || `${item.title}.`,
    details: {
      ...info.details,
      ...(hidden.length ? { hiddenReason: hidden } : {}),
      ...(item.outOfStock ? { sourcing: "supplier-out-of-stock" } : {}),
    },
    complete: info.complete,
  };
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

async function uploadImage(db, item) {
  const buf = await sharp(fs.readFileSync(item.localPath))
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1200, height: 1200, fit: "contain", background: "#ffffff" })
    .webp({ quality: 82 })
    .toBuffer();
  const objectPath = `products/cosmetics/${item.aisleId}/lf-${item.productId}.webp`;
  await withRetries(async () => {
    const { error } = await db.storage.from(BUCKET).upload(objectPath, buf, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw error;
  }, `upload ${item.id}`);
  return db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

function productRow(item, image) {
  const h = hashStr(item.id);
  const { description, details } = productInfo(item);
  return seedRowFromJson({
    id: item.id,
    title: `${item.title} – One Source`,
    price: item.price,
    originalPrice: item.originalPrice,
    rating: item.rating ?? Number((4.2 + (h % 8) * 0.1).toFixed(1)),
    reviewCount: item.reviewCount ?? 6 + (h % 150),
    image,
    category: COSMETICS_CATEGORY_ID,
    unit: unitFromTitle(item.title),
    prime: true,
    description,
    inStock: true,
    stockQuantity: 15,
    delivery: "FREE same-day delivery on orders over USh 100,000",
    details,
    published: true,
  });
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
  console.log(`Mode: ${dryRun ? "dry-run" : "import"} | concurrency=${CONCURRENCY}${limitArg ? ` | limit=${limitArg}` : ""}${aisleArg ? ` | aisle=${aisleArg}` : ""}`);

  const crawl = loadCrawl();
  const db = requireSupabase();
  const existing = await fetchAll(db, "id,title,description,details", (q) => q.like("id", "cosmetics-%"));
  // Compare without the aisle part: rows may have moved aisle since _matches.json was written.
  const existingKeys = new Set(existing.map((r) => productIdWithoutAisle("cosmetics", r.id)));
  const existingLf = new Set(existing.map((r) => r.id.match(/-lf-(\d+)$/)?.[1]).filter(Boolean));
  const matchesFile = path.join(LF_DIR, "_matches.json");
  const matches = fs.existsSync(matchesFile) ? JSON.parse(fs.readFileSync(matchesFile, "utf8")) : {};
  const matchedLf = new Set(
    Object.entries(matches)
      .filter(([id]) => existingKeys.has(productIdWithoutAisle("cosmetics", id)))
      .map(([, m]) => String(m.lfId))
  );

  const candidates = crawl.products.map((p) => ({ productId: String(p.id), title: fullName(p), brand: cleanText(p.brand) }));
  const titleDup = listedDuplicates(existing, candidates);
  for (const lfId of titleDup.keys()) matchedLf.add(lfId);
  console.log(`Existing cosmetics: ${existing.length} | listed LF ids: ${existingLf.size} | Boots↔LF matches: ${matchedLf.size} (title matches ${titleDup.size})`);

  const { items: all, skipped } = planItems(crawl, existingLf, matchedLf);
  const items = limitArg > 0 ? all.slice(0, limitArg) : all;
  console.log(`\nCrawl products: ${crawl.products.length} → importable: ${all.length}${limitArg ? ` (limit ${items.length})` : ""}`);
  console.log("Skipped:");
  for (const [reason, s] of Object.entries(skipped).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  • ${reason}: ${s.count}  e.g. ${s.examples.slice(0, 3).join(" | ")}`);
  }

  const byAisle = {};
  const byGroup = {};
  let complete = 0;
  for (const item of items) {
    byAisle[item.aisleId] = (byAisle[item.aisleId] ?? 0) + 1;
    const group = item.group ?? (item.outOfStock ? "out-of-stock (cosmetics)" : "in-stock (cosmetics)");
    byGroup[group] = (byGroup[group] ?? 0) + 1;
    if (productInfo(item).complete) complete += 1;
  }
  console.log("\nBy aisle:");
  for (const [aisle, n] of Object.entries(byAisle).sort((a, b) => b[1] - a[1])) console.log(`  • ${aisle}: ${n}`);
  console.log("\nBy group:");
  for (const [g, n] of Object.entries(byGroup).sort((a, b) => b[1] - a[1])) console.log(`  • ${g}: ${n}`);
  console.log(`Out of stock at supplier: ${items.filter((i) => i.outOfStock).length} | titles restored: ${items.filter((i) => i.titleRestored).length}`);
  console.log(`Complete product information: ${complete}/${items.length}`);

  if (dryRun) {
    const out = "/tmp/lf-folder-plan.json";
    fs.writeFileSync(out, JSON.stringify({ skipped, items: items.map(({ description, ...i }) => i) }, null, 1));
    console.log(`\nSample:`);
    for (const a of Object.keys(byAisle)) {
      for (const i of items.filter((x) => x.aisleId === a).filter((_, n) => n % 211 === 0).slice(0, 3)) {
        console.log(`  ${a.padEnd(15)} £${String(i.gbp).padEnd(7)} USh ${String(i.price).padStart(9)}  ${i.title}`);
      }
    }
    console.log(`\nPlan → ${out}`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(HOME, "backups", `lf-folder-import-${stamp}.json`);
  fs.mkdirSync(path.dirname(backupFile), { recursive: true });
  const overwritten = existing.filter((r) => items.some((i) => i.id === r.id));
  fs.writeFileSync(backupFile, JSON.stringify({ source: ROOT, createdAt: stamp, ids: items.map((i) => i.id), overwritten }, null, 1));
  console.log(`\nBackup → ${backupFile} (${items.length} new ids, ${overwritten.length} existing rows)`);

  let done = 0;
  let index = 0;
  const errors = [];
  let pending = [];
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      try {
        // Build the row before touching `pending`: another worker may swap it out during the upload.
        const row = productRow(item, await uploadImage(db, item));
        pending.push(row);
      } catch (err) {
        errors.push(item.id);
        console.error(`  ✗ ${item.id}: ${err.message}`);
      }
      done += 1;
      if (pending.length >= UPSERT_CHUNK) {
        const chunk = pending;
        pending = [];
        await upsertRows(db, chunk);
      }
      if (done % 500 === 0 || done === items.length) console.log(`  … ${done}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  if (pending.length) await upsertRows(db, pending);

  console.log(`\nDone. imported: ${items.length - errors.length} | errors: ${errors.length}`);
  if (errors.length) {
    fs.writeFileSync(backupFile.replace(/\.json$/, "-errors.json"), JSON.stringify(errors));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Lookfantastic folder import failed:", err.message);
  process.exit(1);
});

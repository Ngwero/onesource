/**
 * Import the full Cookwarestore UK scrape (products.csv + image folders) into
 * the Kitchen shop aisles. Listings already imported from the older image-only
 * Cookwarestore folder (same article id) are left untouched.
 *
 * Source (default):
 *   /Users/user/cookwarestore-scraper/products/products.csv
 *
 * Usage:
 *   cd server && npm run import:cookwarestore-csv -- --dry-run
 *   cd server && npm run import:cookwarestore-csv
 *   cd server && npm run import:cookwarestore-csv -- --aisle tabletop --limit 50
 *
 * Prices: electric tea & coffee kit goes to Small appliances at the UK price
 * ex-VAT × CWS_GBP_TO_UGX; everything else uses the Kampala shelf-price bands
 * in ugandanKitchenPrices.js.
 *
 * Product id: kitchen-{aisleId}-cws{productId}
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { KITCHEN_WARE_AISLES, KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";
import { gbpToUgandanKitchenPrice, roundUgx } from "../lib/ugandanKitchenPrices.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_CSV =
  process.env.CWS_CATALOG?.trim() || "/Users/user/cookwarestore-scraper/products/products.csv";
const CATALOG_ROOT = path.dirname(CATALOG_CSV);
const GBP_TO_UGX = Number(process.env.CWS_GBP_TO_UGX || 4900);
const UK_VAT = 1.2;

const dryRun = process.argv.includes("--dry-run");
const aisleArg = flagValue("--aisle");
const limitArg = Number(flagValue("--limit") || 0);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 4));
const UPSERT_CHUNK = 200;

const AISLE_TITLES = Object.fromEntries(KITCHEN_WARE_AISLES.map((a) => [a.id, a.title]));

const SKIP_CATEGORY = [/^Barbecue \/ Barbecue Fuel/];

const ELECTRIC =
  /electric|cordless|automatic|\b\d{3,4}\s?w\b|smeg|kitchenaid|bosch|kenwood|de'?longhi|sage|krups|morphy|russell hobbs|dualit|nespresso|melitta|bodum bistro.*(kettle|grinder)|aerolatte/i;

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Minimal RFC 4180 parser (quoted fields, escaped quotes, embedded newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function cookwareMaterialAisle(title, fallback) {
  if (/emile henry/i.test(title)) return "cookware";
  if (/cast iron|enamel/i.test(title)) return "cast-iron";
  if (/carbon steel|black steel|\biron\b/i.test(title)) return "carbon-steel";
  if (/non-?stick|ceramic|hard anodi[sz]ed|teflon|granite/i.test(title)) return "non-stick";
  if (/stainless|clad|tri-?ply|\b18\/10\b|copper/i.test(title)) return "stainless-clad";
  if (/\bstaub\b|le creuset|\blodge\b/i.test(title)) return "cast-iron";
  return fallback;
}

/** Map a Cookwarestore category path onto a One Source Kitchen aisle. */
function aisleFor(category, title) {
  const [top = "", sub = ""] = category.split(" / ");
  switch (top) {
    case "Pots & Pans":
      if (sub === "Pan Lid") return "cookware-accessories";
      if (sub === "Cast Iron Pan") return "cast-iron";
      if (sub === "Stainless Steel Pan") return "stainless-clad";
      if (/Frying Pan|Pancake Pan|Grill Pan|Wok/.test(sub)) return cookwareMaterialAisle(title, "non-stick");
      return cookwareMaterialAisle(title, "cookware");
    case "Tea & Coffee":
      if (/Kettles|Milk Frothers|Coffee Grinders/.test(sub) && ELECTRIC.test(title)) {
        return "small-appliances";
      }
      return "tabletop";
    case "Tableware":
      return "tabletop";
    case "Wine":
      return sub === "Wine Rack" ? "organization" : "tabletop";
    case "Accessories":
      return sub === "Kitchen linens" ? "cookware-accessories" : "organization";
    default:
      return "cookware-accessories";
  }
}

function cleanTitle(raw) {
  return String(raw ?? "")
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function gbpValue(text) {
  const n = Number(String(text || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function priceFor(item) {
  const ukExVat = roundUgx((item.gbp / UK_VAT) * GBP_TO_UGX);
  if (item.aisleId === "small-appliances") return ukExVat;
  const shelf = gbpToUgandanKitchenPrice(item.gbp, {
    id: item.id,
    title: item.title,
    aisleId: item.aisleId,
  });
  return Math.min(shelf, ukExVat);
}

async function listCatalogItems() {
  const rows = parseCsv(await fs.readFile(CATALOG_CSV, "utf8"));
  const items = [];
  const seen = new Set();
  const skipped = { category: 0, outOfStock: 0, noData: 0, duplicate: 0 };

  for (const row of rows) {
    const category = row.category.trim();
    if (SKIP_CATEGORY.some((re) => re.test(category))) {
      skipped.category += 1;
      continue;
    }
    if (row.in_stock !== "yes") {
      skipped.outOfStock += 1;
      continue;
    }
    const title = cleanTitle(row.name);
    const gbp = gbpValue(row.price);
    if (!title || !row.image_file || !row.product_id || !(gbp > 0)) {
      skipped.noData += 1;
      continue;
    }
    if (seen.has(row.product_id)) {
      skipped.duplicate += 1;
      continue;
    }
    seen.add(row.product_id);

    const aisleId = aisleFor(category, title);
    if (aisleArg && aisleId !== aisleArg) continue;

    const item = {
      id: `kitchen-${aisleId}-cws${row.product_id}`,
      productId: row.product_id,
      title,
      aisleId,
      leaf: category.split(" / ").pop(),
      gbp,
      localPath: path.join(CATALOG_ROOT, row.image_file),
    };
    item.price = priceFor(item);
    items.push(item);
  }
  return { items, rowCount: rows.length, skipped };
}

async function ensureCategory(db) {
  const { error } = await db.from("categories").upsert(
    {
      id: KITCHEN_WARE_CATEGORY_ID,
      name: "Kitchen Ware",
      icon: "🍳",
      category_group: "specialty",
      sort_order: 14,
      active: true,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

/** Cookwarestore article ids already listed, from this or the older importer. */
async function loadExistingArticleIds(db) {
  const ids = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("products")
      .select("id")
      .like("id", "kitchen-%-cws%")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data ?? []) {
      const m = row.id.match(/-cws(\d+)$/);
      if (m) ids.add(m[1]);
    }
    if ((data ?? []).length < 1000) break;
  }
  return ids;
}

async function withRetries(fn, label, attempts = 4) {
  for (let i = 1; ; i += 1) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      const delay = Math.min(8000, 500 * 2 ** (i - 1));
      console.warn(`  retry ${i}/${attempts} ${label}: ${err.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function uploadImage(db, item) {
  const optimized = await sharp(await fs.readFile(item.localPath))
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const objectPath = `products/kitchen-ware/${item.aisleId}/cws-${item.productId}.webp`;
  await withRetries(async () => {
    const { error } = await db.storage.from(BUCKET).upload(objectPath, optimized, {
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
  return seedRowFromJson({
    id: item.id,
    title: `${item.title} – One Source`,
    price: item.price,
    originalPrice: h % 4 === 0 ? roundUgx(item.price * 1.12) : undefined,
    rating: Number((4.2 + (h % 7) * 0.1).toFixed(1)),
    reviewCount: 10 + (h % 180),
    image,
    category: KITCHEN_WARE_CATEGORY_ID,
    unit: "each",
    prime: true,
    description: `${item.title}. ${item.leaf.toLowerCase()} for home kitchens (${
      AISLE_TITLES[item.aisleId] ?? "Kitchen"
    }). Add it to the same basket as your fresh produce.`,
    inStock: true,
    stockQuantity: 6 + (h % 35),
    delivery: "FREE same-day delivery on orders over USh 100,000",
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
  console.log(`Catalog: ${CATALOG_CSV}`);
  console.log(
    `Mode: ${dryRun ? "dry-run" : "import"} | concurrency=${CONCURRENCY}` +
      (aisleArg ? ` | aisle=${aisleArg}` : "") +
      (limitArg ? ` | limit=${limitArg}` : "")
  );

  const { items: allItems, rowCount, skipped } = await listCatalogItems();
  console.log(`CSV rows: ${rowCount} → ${allItems.length} products`, skipped);

  const db = requireSupabase();
  const existing = await loadExistingArticleIds(db);
  const fresh = allItems.filter((i) => !existing.has(i.productId));
  const items = limitArg > 0 ? fresh.slice(0, limitArg) : fresh;
  console.log(`Already listed: ${allItems.length - fresh.length} | new: ${fresh.length}`);

  const byAisle = new Map();
  for (const item of items) byAisle.set(item.aisleId, (byAisle.get(item.aisleId) || 0) + 1);
  console.log("\nNew by kitchen aisle:");
  for (const [aisle, count] of [...byAisle.entries()].sort()) console.log(`  • ${aisle}: ${count}`);

  if (dryRun) {
    console.log("\nSample records:");
    const samples = [...byAisle.keys()].flatMap((a) =>
      items.filter((i) => i.aisleId === a).filter((_, n) => n % 97 === 0).slice(0, 4)
    );
    for (const item of samples) {
      console.log(`  ${item.aisleId.padEnd(22)} USh ${String(item.price).padStart(8)}  £${item.gbp}  ${item.title}`);
    }
    return;
  }

  await ensureCategory(db);
  let done = 0;
  let index = 0;
  const errors = [];
  let pending = [];

  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      try {
        pending.push(productRow(item, await uploadImage(db, item)));
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
      if (done % 250 === 0 || done === items.length) console.log(`  … ${done}/${items.length}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  if (pending.length) await upsertRows(db, pending);

  console.log("\nDone.");
  console.log(`  imported: ${items.length - errors.length}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Cookwarestore CSV import failed:", err.message);
  process.exit(1);
});

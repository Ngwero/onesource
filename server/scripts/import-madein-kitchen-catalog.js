/**
 * Import Made In Cookware (UK) into kitchen-ware products.
 *
 * Expands Shopify variants (size / colour / finish) into separate listings —
 * shop-all has ~35 products but ~86 purchasable variants.
 *
 * Images: prefer variant featured image from Shopify CDN, else local catalog
 * gallery (first image for that handle).
 *
 * Usage:
 *   cd server && npm run import:madein-kitchen
 *   cd server && npm run import:madein-kitchen -- --dry-run
 *   cd server && npm run import:madein-kitchen -- --replace
 *   cd server && npm run import:madein-kitchen -- --aisle stainless-clad
 *   cd server && npm run import:madein-kitchen -- --limit 10
 *
 * Product id: kitchen-{aisleId}-madein-{handle}-{variantId}
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_ROOT =
  process.env.MADEIN_KITCHEN_CATALOG?.trim() ||
  "/Users/user/kitchen ware/MadeIn_Cookware";
const SHOP_JSON =
  process.env.MADEIN_SHOP_JSON?.trim() ||
  "https://www.madeincookware.co.uk/collections/shop-all/products.json";

/** Rough GBP → UGX for display prices (override with MADEIN_UGX_PER_GBP). */
const UGX_PER_GBP = Number(process.env.MADEIN_UGX_PER_GBP || 4800);

const dryRun = process.argv.includes("--dry-run");
const replaceExisting = process.argv.includes("--replace");
const aisleArg = flagValue("--aisle") || flagValue("--category");
const limitArg = Number(flagValue("--limit") || 0);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 4));

const TYPE_AISLES = {
  "Stainless Clad": {
    aisleId: "stainless-clad",
    title: "Stainless clad",
    folder: "Stainless_Clad",
  },
  "Carbon Steel": {
    aisleId: "carbon-steel",
    title: "Carbon steel",
    folder: "Carbon_Steel",
  },
  "Enamelled Cast Iron": {
    aisleId: "cast-iron",
    title: "Enamelled cast iron",
    folder: "Enamelled_Cast_Iron",
  },
  "Non Stick": {
    aisleId: "non-stick",
    title: "Non-stick",
    folder: "Non_Stick",
  },
  Accessories: {
    aisleId: "cookware-accessories",
    title: "Cookware accessories",
    folder: "Accessories",
  },
  Tabletop: {
    aisleId: "tabletop",
    title: "Tabletop",
    folder: "Tabletop",
  },
};

const FILE_RE = /^(.+)_(\d{2})_([A-Za-z0-9-]+)\.(jpe?g|png|webp)$/i;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".webp", ".png"]);

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function productId(aisleId, handle, variantId) {
  return `kitchen-${aisleId}-madein-${handle}-${variantId}`;
}

function cleanTitle(raw) {
  let t = String(raw ?? "")
    .replace(/®/g, "")
    .replace(/\s+/g, " ")
    .trim();
  t = t.replace(/\bCeramiClad\b/gi, "Ceramic non-stick");
  if (!t) return "Made In cookware";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function variantLabel(variant) {
  const parts = [variant.option1, variant.option2, variant.option3]
    .map((x) => (x || "").trim())
    .filter((x) => x && !/^default\s*title$/i.test(x));
  return parts.join(" · ");
}

function buildTitle(productTitle, variant) {
  const base = cleanTitle(productTitle);
  const label = variantLabel(variant);
  return label ? `${base} – ${label}` : base;
}

function gbpToUgx(gbp) {
  const n = Number(gbp);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n * UGX_PER_GBP) / 1000) * 1000;
}

function fallbackPrice(aisleId, key) {
  const ranges = {
    "stainless-clad": [280000, 1850000],
    "carbon-steel": [220000, 980000],
    "cast-iron": [320000, 1450000],
    "non-stick": [180000, 720000],
    "cookware-accessories": [45000, 380000],
    tabletop: [95000, 620000],
  };
  const [min, max] = ranges[aisleId] || [120000, 600000];
  return min + (hashStr(key) % Math.max(1, max - min));
}

async function fetchShopProducts() {
  const products = [];
  let page = 1;
  while (page <= 20) {
    const url = new URL(SHOP_JSON);
    url.searchParams.set("limit", "250");
    url.searchParams.set("page", String(page));
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });
    if (!res.ok) {
      throw new Error(`Shopify JSON ${res.status} for ${url}`);
    }
    const batch = (await res.json()).products || [];
    if (!batch.length) break;
    products.push(...batch);
    if (batch.length < 250) break;
    page += 1;
  }
  return products;
}

async function indexLocalImages() {
  /** handle -> absolute path of lowest-index gallery image */
  const byHandle = new Map();
  let entries;
  try {
    entries = await fs.readdir(CATALOG_ROOT, { withFileTypes: true });
  } catch {
    return byHandle;
  }

  async function walk(dir) {
    const names = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of names) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!IMAGE_EXTS.has(path.extname(ent.name).toLowerCase())) continue;
      const m = ent.name.match(FILE_RE);
      if (!m) continue;
      const index = Number(m[2]);
      const handle = m[3].toLowerCase();
      const prev = byHandle.get(handle);
      if (!prev || index < prev.index) {
        byHandle.set(handle, { index, absolutePath: full });
      }
    }
  }

  for (const ent of entries) {
    if (ent.isDirectory()) await walk(path.join(CATALOG_ROOT, ent.name));
  }
  return byHandle;
}

function variantImageUrl(product, variant) {
  const images = product.images || [];
  if (variant.featured_image?.src) return variant.featured_image.src;
  if (variant.image_id) {
    const hit = images.find((img) => img.id === variant.image_id);
    if (hit?.src) return hit.src;
  }
  return images[0]?.src || null;
}

async function listCatalogItems() {
  const [shopProducts, localByHandle] = await Promise.all([
    fetchShopProducts(),
    indexLocalImages(),
  ]);

  const items = [];
  let skippedUnavailable = 0;

  for (const product of shopProducts) {
    const type = product.product_type || "Other";
    const aisle = TYPE_AISLES[type];
    if (!aisle) continue;
    if (aisleArg && aisle.aisleId !== aisleArg && aisle.folder !== aisleArg) {
      continue;
    }

    const handle = String(product.handle || "").toLowerCase();
    if (!handle) continue;
    const local = localByHandle.get(handle);

    for (const variant of product.variants || []) {
      if (variant.available === false && variant.inventory_quantity === 0) {
        // Still import — stock can be set positive for the shop clone
        skippedUnavailable += 0;
      }
      const variantId = String(variant.id);
      const title = buildTitle(product.title, variant);
      const price =
        gbpToUgx(variant.price) ??
        Math.round(fallbackPrice(aisle.aisleId, `${handle}-${variantId}`) / 1000) *
          1000;

      items.push({
        id: productId(aisle.aisleId, handle, variantId),
        handle,
        variantId,
        title,
        aisleId: aisle.aisleId,
        aisleTitle: aisle.title,
        productType: type,
        price,
        gbp: Number(variant.price) || null,
        sku: variant.sku || null,
        imageUrl: variantImageUrl(product, variant),
        localPath: local?.absolutePath || null,
        optionLabel: variantLabel(variant),
      });
    }
  }

  return { items, shopCount: shopProducts.length, skippedUnavailable };
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

async function loadExistingMadeIn(db) {
  const existingIds = new Set();
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("id,image")
      .like("id", "kitchen-%-madein-%")
      .range(from, from + 999);
    if (error) throw error;
    const page = data ?? [];
    for (const row of page) {
      existingIds.add(row.id);
      rows.push(row);
    }
    if (page.length < 1000) break;
    from += 1000;
  }
  return { existingIds, rows };
}

function storagePathFromPublicUrl(url) {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length));
}

async function deleteExistingMadeIn(db, rows) {
  const paths = [];
  for (const row of rows) {
    const p = storagePathFromPublicUrl(row.image);
    if (p) paths.push(p);
  }
  for (let i = 0; i < paths.length; i += 50) {
    const chunk = paths.slice(i, i + 50);
    const { error } = await db.storage.from(BUCKET).remove(chunk);
    if (error) console.warn(`  storage remove: ${error.message}`);
  }
  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error } = await db.from("products").delete().in("id", chunk);
    if (error) throw error;
  }
  console.log(`Removed ${ids.length} existing Made In products`);
}

async function loadImageBuffer(item) {
  if (item.imageUrl) {
    try {
      const res = await fetch(item.imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "image/*,*/*",
        },
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 500) return buf;
      }
    } catch {
      /* fall through */
    }
  }
  if (item.localPath) {
    return fs.readFile(item.localPath);
  }
  throw new Error(`No image for ${item.id}`);
}

async function uploadImage(db, item) {
  const input = await loadImageBuffer(item);
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

  const objectPath = `products/kitchen-ware/${item.aisleId}/madein-${item.handle}-${item.variantId}.webp`;
  const { error } = await db.storage.from(BUCKET).upload(objectPath, optimized, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
  return db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
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
        errors.push({ id: item.id, message: err.message });
        console.error(`  ✗ ${item.id}: ${err.message}`);
      }
      done += 1;
      if (done % 10 === 0 || done === total) {
        console.log(`  … ${done}/${total}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next())
  );
  return errors;
}

async function main() {
  console.log(`Shop JSON: ${SHOP_JSON}`);
  console.log(`Local catalog: ${CATALOG_ROOT}`);
  console.log(
    `Mode: ${dryRun ? "dry-run" : "import"} | concurrency=${CONCURRENCY}` +
      (replaceExisting ? " | replace" : "") +
      (aisleArg ? ` | aisle=${aisleArg}` : "") +
      (limitArg ? ` | limit=${limitArg}` : "")
  );

  const { items: allItems, shopCount } = await listCatalogItems();
  const items = limitArg > 0 ? allItems.slice(0, limitArg) : allItems;

  console.log(
    `Shopify products: ${shopCount} → ${allItems.length} variants` +
      (limitArg ? ` (processing ${items.length})` : "")
  );

  const byAisle = new Map();
  for (const item of items) {
    byAisle.set(item.aisleId, (byAisle.get(item.aisleId) || 0) + 1);
  }
  console.log("\nBy kitchen aisle:");
  for (const [aisle, count] of [...byAisle.entries()].sort()) {
    console.log(`  • ${aisle}: ${count}`);
  }

  if (dryRun) {
    console.log("\nSample records:");
    for (const item of items.slice(0, 15)) {
      console.log(
        `  ${item.id}\n    ${item.title} | USh ${item.price.toLocaleString()}` +
          (item.gbp ? ` (£${item.gbp})` : "")
      );
    }
    return;
  }

  const db = requireSupabase();
  await ensureCategory(db);
  const { existingIds, rows: existingRows } = await loadExistingMadeIn(db);

  if (replaceExisting && existingRows.length) {
    await deleteExistingMadeIn(db, existingRows);
    existingIds.clear();
  }

  const toImport = [];
  let skippedExisting = 0;
  for (const item of items) {
    if (existingIds.has(item.id)) {
      skippedExisting += 1;
      continue;
    }
    toImport.push(item);
  }

  console.log(
    `\nImporting ${toImport.length} (skip ${skippedExisting} existing)…`
  );

  const seedRows = [];
  const errors = await runPool(toImport, CONCURRENCY, async (item, index) => {
    const image = await uploadImage(db, item);
    const h = hashStr(item.id);
    seedRows.push(
      seedRowFromJson({
        id: item.id,
        title: `${item.title} – One Source`,
        price: item.price,
        originalPrice: index % 3 === 0 ? Math.round(item.price * 1.1) : undefined,
        rating: Number((4.4 + (h % 5) * 0.1).toFixed(1)),
        reviewCount: 18 + (h % 140),
        image,
        category: KITCHEN_WARE_CATEGORY_ID,
        unit: "each",
        prime: true,
        description: `${item.title}. Made In cookware for home kitchens (${item.aisleTitle}${
          item.optionLabel ? ` · ${item.optionLabel}` : ""
        }). Add it to the same basket as your fresh produce.`,
        inStock: true,
        stockQuantity: 4 + (h % 20),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  });

  let upserted = 0;
  for (let i = 0; i < seedRows.length; i += 80) {
    const chunk = seedRows.slice(i, i + 80);
    const { error } = await db.from("products").upsert(chunk, {
      onConflict: "id",
    });
    if (error) throw error;
    upserted += chunk.length;
    console.log(`  upserted ${upserted}/${seedRows.length}`);
  }

  console.log("\nDone.");
  console.log(`  imported: ${seedRows.length}`);
  console.log(`  skipped existing: ${skippedExisting}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Made In kitchen import failed:", err.message);
  process.exit(1);
});

/**
 * Import the Clabane skincare catalogue into the Cosmetics shop.
 *
 * Source (default):
 *   /Users/user/Desktop/clabane-products/products.json (+ images/)
 *
 * Usage:
 *   cd server && npm run import:clabane
 *   cd server && npm run import:clabane -- --dry-run
 *   cd server && npm run import:clabane -- --reuse-images
 *   cd server && npm run import:clabane -- --only cosmetics-sunscreen-clabane-sunscreen-duo
 *
 * Product id: cosmetics-{aisleId}-{handle}
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_JSON =
  process.env.CLABANE_CATALOG?.trim() ||
  "/Users/user/Desktop/clabane-products/products.json";
const CATALOG_ROOT = path.dirname(CATALOG_JSON);
const COSMETICS_CATEGORY_ID = "cosmetics";

const dryRun = process.argv.includes("--dry-run");
const reuseImages = process.argv.includes("--reuse-images");
const limitArg = Number(flagValue("--limit") || 0);
const onlyIds = new Set(
  (flagValue("--only") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 6));

/** Keep ids in sync with src/data/cosmetics.ts. First match wins. */
const AISLE_RULES = [
  {
    aisleId: "kits-bundles",
    test: ({ title, type, tags }) =>
      tags.includes("bundle") ||
      type === "skin care combo" ||
      /\b(kit|duo|trio|bundle|collection)\b/i.test(title),
  },
  {
    aisleId: "sun-protection",
    test: ({ title }) => /\bspf\b|sunscreen|\buv\b/i.test(title),
  },
  { aisleId: "acne-care", test: ({ title }) => /acne|pore/i.test(title) },
  {
    aisleId: "serums-oils",
    test: ({ title }) => /serum|vitamin c oil/i.test(title),
  },
  {
    aisleId: "cleansers-bars",
    test: ({ title }) => /cleanser|cleansing|\bbar\b|soap|scrub/i.test(title),
  },
  {
    aisleId: "hair-baby-more",
    test: ({ title }) => /shampoo|hair|baby|detergent|toiletries/i.test(title),
  },
  {
    aisleId: "face-eye-care",
    test: ({ title }) => /\bface\b|\beye\b|gel cream/i.test(title),
  },
  { aisleId: "body-care", test: () => true },
];

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function resolveAisle(product) {
  const ctx = {
    title: String(product.title ?? ""),
    type: String(product.product_type ?? "").trim().toLowerCase(),
    tags: (Array.isArray(product.tags) ? product.tags : []).map((t) =>
      String(t).toLowerCase()
    ),
  };
  return AISLE_RULES.find((rule) => rule.test(ctx)).aisleId;
}

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function toPrice(raw) {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function unitFor(variant) {
  const title = String(variant?.title ?? "").trim();
  if (!/^\d[\d.,]*\s*(ml|mls|g|kg|l)$/i.test(title)) return "each";
  return title;
}

function cleanDescription(product) {
  const text = String(product.description ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= 1800) return text;
  return `${text.slice(0, 1800).replace(/\s+\S*$/, "")}…`;
}

async function listCatalogItems() {
  const raw = JSON.parse(await fs.readFile(CATALOG_JSON, "utf8"));
  const products = Array.isArray(raw) ? raw : raw.products ?? [];
  const items = [];
  const skipped = { noPrice: 0, noImage: 0 };

  for (const product of products) {
    const variant = product.variants?.[0];
    const price = toPrice(variant?.price);
    if (!price) {
      skipped.noPrice += 1;
      continue;
    }
    const image = (product.images ?? []).find((img) => img.local_path);
    if (!image) {
      skipped.noImage += 1;
      continue;
    }
    const aisleId = resolveAisle(product);
    const handle = slug(product.handle || product.title);
    const compareAt = toPrice(variant?.compare_at_price);
    items.push({
      id: `cosmetics-${aisleId}-${handle}`,
      sourceId: String(product.id),
      aisleId,
      handle,
      title: String(product.title).trim(),
      price,
      originalPrice: compareAt && compareAt > price ? compareAt : undefined,
      unit: unitFor(variant),
      available: (product.variants ?? []).some((v) => v.available !== false),
      description: cleanDescription(product),
      absolutePath: path.join(CATALOG_ROOT, image.local_path),
    });
  }

  return { items, skipped };
}

async function ensureCategory(db) {
  const { error } = await db.from("categories").upsert(
    {
      id: COSMETICS_CATEGORY_ID,
      name: "Cosmetics",
      icon: "💄",
      category_group: "specialty",
      sort_order: 15,
      active: true,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function withRetries(fn, { attempts = 4, label = "op" } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = Math.min(8000, 400 * 2 ** (i - 1));
      console.warn(`  retry ${i}/${attempts} ${label}: ${err.message} (wait ${delay}ms)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function storageObjectPath(item) {
  return `products/cosmetics/${item.aisleId}/${item.handle}.webp`;
}

function publicImageUrl(db, item) {
  return db.storage.from(BUCKET).getPublicUrl(storageObjectPath(item)).data.publicUrl;
}

async function uploadImage(db, item) {
  if (reuseImages) return publicImageUrl(db, item);

  const input = await fs.readFile(item.absolutePath);
  const optimized = await sharp(input)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  await withRetries(
    async () => {
      const { error } = await db.storage.from(BUCKET).upload(storageObjectPath(item), optimized, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
      if (error) throw error;
    },
    { label: `upload ${item.id}` }
  );
  return publicImageUrl(db, item);
}

function buildProductRow(item, image) {
  const seed = Number(item.sourceId.slice(-4)) || item.handle.length;
  return seedRowFromJson({
    id: item.id,
    title: `${item.title} – One Source`,
    price: item.price,
    originalPrice: item.originalPrice,
    rating: Number((4.3 + (seed % 7) * 0.1).toFixed(1)),
    reviewCount: 8 + (seed % 120),
    image,
    category: COSMETICS_CATEGORY_ID,
    unit: item.unit,
    prime: true,
    description: item.description,
    inStock: item.available,
    stockQuantity: item.available ? 25 : 0,
    delivery: "FREE same-day delivery on orders over USh 100,000",
  });
}

async function runPool(items, concurrency, worker) {
  let index = 0;
  const errors = [];
  async function next() {
    while (index < items.length) {
      const item = items[index++];
      try {
        await worker(item);
      } catch (err) {
        errors.push({ id: item.id, message: err.message });
        console.error(`  ✗ ${item.id}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return errors;
}

async function main() {
  console.log(`Catalog: ${CATALOG_JSON}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "import"}${reuseImages ? " | reuse-images" : ""}`);

  const { items: allItems, skipped } = await listCatalogItems();
  let items = limitArg > 0 ? allItems.slice(0, limitArg) : allItems;
  if (onlyIds.size) items = items.filter((item) => onlyIds.has(item.id));

  console.log(`Parsed ${allItems.length} products (processing ${items.length})`);
  console.log(`Skipped: noPrice=${skipped.noPrice} noImage=${skipped.noImage}`);

  const byAisle = new Map();
  for (const item of items) byAisle.set(item.aisleId, [...(byAisle.get(item.aisleId) ?? []), item]);
  for (const [aisle, list] of [...byAisle.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  • ${aisle}: ${list.length}`);
    if (dryRun) {
      for (const item of list) {
        console.log(
          `      USh ${item.price.toLocaleString()}${item.originalPrice ? ` (was ${item.originalPrice.toLocaleString()})` : ""} | ${item.unit} | ${item.title}`
        );
      }
    }
  }

  if (dryRun) {
    const missing = [];
    for (const item of items) {
      await fs.access(item.absolutePath).catch(() => missing.push(item.absolutePath));
    }
    console.log(`\nMissing image files: ${missing.length}`);
    for (const file of missing) console.log(`  ${file}`);
    return;
  }

  const db = requireSupabase();
  await ensureCategory(db);

  const rows = [];
  const errors = await runPool(items, CONCURRENCY, async (item) => {
    const image = await uploadImage(db, item);
    rows.push(buildProductRow(item, image));
  });

  console.log(`\nUpserting ${rows.length} products…`);
  await withRetries(
    async () => {
      const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    },
    { attempts: 6, label: "upsert" }
  );

  console.log("\nDone.");
  console.log(`  imported: ${rows.length}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Clabane import failed:", err.message);
  process.exit(1);
});

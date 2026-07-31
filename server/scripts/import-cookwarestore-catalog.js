/**
 * Import Cookwarestore UK catalog images into kitchen-ware products.
 *
 * Source (default):
 *   /Users/user/kitchen ware/Cookwarestore_UK
 *
 * Usage:
 *   cd server && npm run import:cookwarestore
 *   cd server && npm run import:cookwarestore -- --dry-run
 *   cd server && npm run import:cookwarestore -- --aisle tabletop
 *   cd server && npm run import:cookwarestore -- --reuse-images
 *   cd server && npm run import:cookwarestore -- --limit 20
 *   cd server && npm run import:cookwarestore -- --concurrency 8
 *
 * Folder → aisle:
 *   Cast_Iron_Pan → cast-iron
 *   Stainless_Steel_Pan → stainless-clad
 *   Frying_Pan / Pancake_Pan → non-stick
 *   Other Pots_Pans → cookware
 *   Cooking_Utensils / Kitchen_Knives / Baking / lids → cookware-accessories
 *   Tableware → tabletop
 *
 * Product id: kitchen-{aisleId}-cws{articleId}
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_ROOT =
  process.env.COOKWARESTORE_CATALOG?.trim() ||
  "/Users/user/kitchen ware/Cookwarestore_UK";

const dryRun = process.argv.includes("--dry-run");
const reuseImages = process.argv.includes("--reuse-images");
const forceUpload = process.argv.includes("--force-upload");
const aisleArg = flagValue("--aisle");
const limitArg = Number(flagValue("--limit") || 0);
const onlyIds = new Set(
  (flagValue("--only") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 8));
const UPSERT_CHUNK = Math.max(10, Number(flagValue("--upsert-chunk") || 40));

/**
 * Map relative folder paths to kitchen aisles.
 * More specific rules first; Pots_Pans default last.
 */
const FOLDER_RULES = [
  {
    test: (rel) => rel.startsWith("Pots_Pans/Cast_Iron_Pan/"),
    aisleId: "cast-iron",
    aisleTitle: "Enamelled cast iron",
  },
  {
    test: (rel) => rel.startsWith("Pots_Pans/Stainless_Steel_Pan/"),
    aisleId: "stainless-clad",
    aisleTitle: "Stainless clad",
  },
  {
    test: (rel) => rel.startsWith("Pots_Pans/Frying_Pan/"),
    aisleId: "non-stick",
    aisleTitle: "Non-stick",
  },
  {
    test: (rel) => rel.startsWith("Pots_Pans/Pancake_Pan/"),
    aisleId: "non-stick",
    aisleTitle: "Non-stick",
  },
  {
    test: (rel) => rel.startsWith("Pots_Pans/Pan_Lid/"),
    aisleId: "cookware-accessories",
    aisleTitle: "Cookware accessories",
  },
  {
    test: (rel) => rel.startsWith("Cooking_Utensils/"),
    aisleId: "cookware-accessories",
    aisleTitle: "Cookware accessories",
  },
  {
    test: (rel) => rel.startsWith("Kitchen_Knives/"),
    aisleId: "cookware-accessories",
    aisleTitle: "Cookware accessories",
  },
  {
    test: (rel) => rel.startsWith("Baking/"),
    aisleId: "cookware-accessories",
    aisleTitle: "Cookware accessories",
  },
  {
    test: (rel) => rel.startsWith("Tableware/"),
    aisleId: "tabletop",
    aisleTitle: "Tabletop",
  },
  {
    test: (rel) => rel.startsWith("Pots_Pans/"),
    aisleId: "cookware",
    aisleTitle: "Cookware",
  },
  // Any future top-level folders land in accessories
  {
    test: () => true,
    aisleId: "cookware-accessories",
    aisleTitle: "Cookware accessories",
  },
];

const PRICE_RANGE = {
  cookware: [55000, 480000],
  "cast-iron": [85000, 620000],
  "stainless-clad": [72000, 520000],
  "non-stick": [48000, 380000],
  "cookware-accessories": [15000, 180000],
  tabletop: [25000, 220000],
};

const FILE_RE = /^(.+)_(\d+)\.webp$/i;

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function decodeScrapedUnicode(text) {
  return String(text ?? "")
    .replace(/u00([0-9a-f]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/u([0-9a-f]{4})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function humanizeFilename(stem) {
  let t = decodeScrapedUnicode(stem)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, ", ")
    .trim();

  t = t
    .replace(/\bRu00f6sle\b/gi, "Rösle")
    .replace(/\bø\b/gi, "Ø")
    .replace(/\s*-\s*/g, " — ")
    .replace(/\s+/g, " ")
    .trim();

  if (!t) return "Kitchen item";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function parseFilename(filename) {
  const m = filename.match(FILE_RE);
  if (!m) return null;
  return {
    stem: m[1],
    articleId: m[2],
    title: humanizeFilename(m[1]),
  };
}

function resolveAisle(relativePosix) {
  for (const rule of FOLDER_RULES) {
    if (rule.test(relativePosix)) {
      return { aisleId: rule.aisleId, aisleTitle: rule.aisleTitle };
    }
  }
  return null;
}

function productId(aisleId, articleId) {
  return `kitchen-${aisleId}-cws${articleId}`;
}

function articleKeyFromProductId(id) {
  const m = String(id).match(/-cws(\d+)$/i);
  return m ? `cws${m[1]}` : null;
}

function priceFor(aisleId, articleId) {
  const [min, max] = PRICE_RANGE[aisleId] || [50000, 250000];
  const n = Number(articleId) || 0;
  const span = max - min;
  const stepped = min + ((n * 7919) % Math.max(1, span));
  return Math.round(stepped / 1000) * 1000;
}

function buildDescription(title, aisleTitle, leafFolder) {
  const type = leafFolder.replace(/_/g, " ").toLowerCase();
  return `${title}. ${aisleTitle} piece (${type}) for home kitchens. Add it to the same basket as your fresh produce.`;
}

async function walkWebpFiles(rootDir) {
  const out = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      throw new Error(`Cannot read ${dir}: ${err.message}`);
    }
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
  return out.sort();
}

async function listCatalogItems() {
  const files = await walkWebpFiles(CATALOG_ROOT);
  const items = [];
  const seen = new Set();
  const skipped = { noParse: 0, noAisle: 0, dupArticle: 0 };

  for (const absolutePath of files) {
    const rel = path.relative(CATALOG_ROOT, absolutePath).split(path.sep).join("/");
    const filename = path.basename(absolutePath);
    const parsed = parseFilename(filename);
    if (!parsed) {
      skipped.noParse += 1;
      continue;
    }

    const aisleResolved = resolveAisle(rel);
    if (!aisleResolved) {
      skipped.noAisle += 1;
      continue;
    }
    if (aisleArg && aisleResolved.aisleId !== aisleArg) continue;

    // Deduplicate by article id globally within this catalog
    if (seen.has(parsed.articleId)) {
      skipped.dupArticle += 1;
      continue;
    }
    seen.add(parsed.articleId);

    const leafFolder = path.basename(path.dirname(absolutePath));
    items.push({
      ...parsed,
      ...aisleResolved,
      leafFolder,
      relativePath: rel,
      absolutePath,
      id: productId(aisleResolved.aisleId, parsed.articleId),
    });
  }

  return { items, skipped };
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

async function loadExistingKeys(db) {
  const existingIds = new Set();
  const articleKeys = new Set();
  let from = 0;
  const page = 1000;

  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("id")
      .like("id", "kitchen-%")
      .range(from, from + page - 1);
    if (error) throw error;
    const rows = data ?? [];
    for (const row of rows) {
      existingIds.add(row.id);
      const key = articleKeyFromProductId(row.id);
      if (key) articleKeys.add(key);
    }
    if (rows.length < page) break;
    from += page;
  }

  return { existingIds, articleKeys };
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

function storageObjectPath(item) {
  return `products/kitchen-ware/${item.aisleId}/cws-${item.articleId}.webp`;
}

function publicImageUrl(db, item) {
  return db.storage.from(BUCKET).getPublicUrl(storageObjectPath(item)).data
    .publicUrl;
}

async function uploadImage(db, item) {
  if (reuseImages && !forceUpload) return publicImageUrl(db, item);

  const input = await fs.readFile(item.absolutePath);
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

  const objectPath = storageObjectPath(item);
  await withRetries(
    async () => {
      const { error } = await db.storage
        .from(BUCKET)
        .upload(objectPath, optimized, {
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

function buildProductRow(item, index, image) {
  const price = priceFor(item.aisleId, item.articleId);
  return seedRowFromJson({
    id: item.id,
    title: `${item.title} – One Source`,
    price,
    originalPrice: index % 5 === 0 ? Math.round(price * 1.14) : undefined,
    rating: Number((4.2 + (Number(item.articleId) % 7) * 0.1).toFixed(1)),
    reviewCount: 10 + (Number(item.articleId) % 180),
    image,
    category: KITCHEN_WARE_CATEGORY_ID,
    unit: "each",
    prime: true,
    description: buildDescription(
      item.title,
      item.aisleTitle,
      item.leafFolder
    ),
    inStock: true,
    stockQuantity: 6 + (Number(item.articleId) % 35),
    delivery: "FREE same-day delivery on orders over USh 100,000",
  });
}

async function upsertRows(db, rows) {
  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    await withRetries(
      async () => {
        const { error } = await db.from("products").upsert(chunk, {
          onConflict: "id",
        });
        if (error) throw error;
      },
      { attempts: 6, label: `upsert ${i}-${i + chunk.length}` }
    );
    upserted += chunk.length;
    console.log(`  upserted ${upserted}/${rows.length}`);
  }
  return upserted;
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
      if (done % 25 === 0 || done === total) {
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
  console.log(`Catalog: ${CATALOG_ROOT}`);
  console.log(
    `Mode: ${dryRun ? "dry-run" : "import"} | concurrency=${CONCURRENCY}` +
      (reuseImages ? " | reuse-images" : "") +
      (aisleArg ? ` | aisle=${aisleArg}` : "") +
      (limitArg ? ` | limit=${limitArg}` : "")
  );

  const { items: allItems, skipped } = await listCatalogItems();
  const items = limitArg > 0 ? allItems.slice(0, limitArg) : allItems;

  console.log(
    `Parsed ${allItems.length} products` +
      (limitArg ? ` (processing ${items.length})` : "")
  );
  console.log(
    `Skipped: noParse=${skipped.noParse} noAisle=${skipped.noAisle} dup=${skipped.dupArticle}`
  );

  const byAisle = new Map();
  for (const item of items) {
    byAisle.set(item.aisleId, (byAisle.get(item.aisleId) || 0) + 1);
  }
  for (const [aisle, count] of [...byAisle.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${aisle}: ${count}`);
  }

  if (dryRun) {
    console.log("\nSample records:");
    for (const item of items.slice(0, 12)) {
      console.log(
        `  ${item.id}\n    ${item.title}\n    ${item.aisleId} | USh ${priceFor(
          item.aisleId,
          item.articleId
        ).toLocaleString()} | ${item.relativePath}`
      );
    }
    return;
  }

  const db = requireSupabase();
  await ensureCategory(db);
  const { existingIds, articleKeys } = await loadExistingKeys(db);

  const toImport = [];
  let skippedExisting = 0;
  for (const item of items) {
    if (onlyIds.size && !onlyIds.has(item.id)) continue;
    const cwsKey = `cws${item.articleId}`;
    const exists =
      existingIds.has(item.id) || articleKeys.has(cwsKey);
    if (exists && !forceUpload && !onlyIds.size) {
      skippedExisting += 1;
      continue;
    }
    toImport.push(item);
  }

  console.log(
    `\nImporting ${toImport.length} (skip ${skippedExisting} existing)…`
  );

  const rows = [];
  const poolConcurrency = reuseImages
    ? Math.min(CONCURRENCY, 20)
    : CONCURRENCY;
  const errors = await runPool(
    toImport,
    poolConcurrency,
    async (item, index) => {
      const image = await uploadImage(db, item);
      rows.push(buildProductRow(item, index, image));
    }
  );

  console.log(`\nUpserting ${rows.length} products (chunk=${UPSERT_CHUNK})…`);
  await upsertRows(db, rows);

  console.log("\nDone.");
  console.log(`  imported: ${rows.length}`);
  console.log(`  skipped existing: ${skippedExisting}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Cookwarestore import failed:", err.message);
  process.exit(1);
});

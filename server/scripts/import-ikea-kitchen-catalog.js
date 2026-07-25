/**
 * Import IKEA Puerto Rico kitchen offer images into kitchen-ware products.
 *
 * Source (default):
 *   /Users/user/kitchen ware/IKEA_Kitchen_Catalog
 *
 * Usage:
 *   cd server && npm run import:ikea-kitchen
 *   cd server && npm run import:ikea-kitchen -- --dry-run
 *   cd server && npm run import:ikea-kitchen -- --category cookware
 *   cd server && npm run import:ikea-kitchen -- --limit 20
 *   cd server && npm run import:ikea-kitchen -- --replace-placeholders
 *
 * Product id: kitchen-{aisleId}-{articleId}
 * Skips when an existing product already uses the same article ID.
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_ROOT =
  process.env.IKEA_KITCHEN_CATALOG?.trim() ||
  "/Users/user/kitchen ware/IKEA_Kitchen_Catalog";

const dryRun = process.argv.includes("--dry-run");
const replacePlaceholders = process.argv.includes("--replace-placeholders");
const categoryArg = flagValue("--category");
const limitArg = Number(flagValue("--limit") || 0);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 5));

/** Process order: prefer primary aisle when the same article appears in Organization too. */
const FOLDER_AISLES = [
  { folder: "Cookware", aisleId: "cookware", title: "Cookware" },
  { folder: "KNOXHULT", aisleId: "knoxhult", title: "Modular kitchen units" },
  {
    folder: "Cabinets,_fronts_and_interiors",
    aisleId: "cabinets",
    title: "Cabinets, fronts and interiors",
  },
  {
    folder: "Kitchen_small_funiture",
    aisleId: "small-furniture",
    title: "Kitchen small furniture",
  },
  {
    folder: "Extractor_hoods",
    aisleId: "extractor-hoods",
    title: "Extractor hoods",
  },
  {
    folder: "Countertops,_faucets_and_sinks",
    aisleId: "countertops-sinks",
    title: "Countertops, faucets and sinks",
  },
  {
    folder: "Organization_in_the_kitchen",
    aisleId: "organization",
    title: "Organization in the kitchen",
  },
];

const PRICE_RANGE = {
  cookware: [48000, 320000],
  knoxhult: [380000, 2800000],
  cabinets: [28000, 520000],
  "small-furniture": [72000, 280000],
  "extractor-hoods": [320000, 780000],
  "countertops-sinks": [85000, 480000],
  organization: [12000, 220000],
};

const FILE_RE = /^(.+)_(\d+)\.webp$/i;

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function cleanDescription(raw) {
  return raw
    .replace(/_,_/g, ", ")
    .replace(/,/g, ", ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, ", ")
    .trim()
    .replace(/^,\s*|,\s*$/g, "");
}

function parseFilename(filename) {
  const m = filename.match(FILE_RE);
  if (!m) return null;
  const stem = m[1];
  const articleId = m[2];
  const parts = stem.split("_");
  const series = parts[0] || "IKEA";
  const description = cleanDescription(parts.slice(1).join("_"));
  return { series, description, articleId };
}

function productId(aisleId, articleId) {
  return `kitchen-${aisleId}-${articleId}`;
}

function articleIdFromProductId(id) {
  const m = String(id).match(/-(\d{6,})$/);
  return m ? m[1] : null;
}

function isPlaceholderKitchenId(id) {
  // Old synthetic SKUs like kitchen-cookware-01 (short numeric suffix)
  return /^kitchen-[a-z0-9-]+-\d{1,3}$/i.test(id);
}

function priceFor(aisleId, articleId) {
  const [min, max] = PRICE_RANGE[aisleId] || [50000, 250000];
  const n = Number(articleId) || 0;
  const span = max - min;
  const stepped = min + ((n * 7919) % Math.max(1, span));
  // Round to nearest 1000 UGX
  return Math.round(stepped / 1000) * 1000;
}

function humanizeKitchenTitle(rawTitle) {
  let t = String(rawTitle ?? "")
    .replace(/\s*[–—-]\s*One Source\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const seriesPrefix =
    /^[A-ZÄÖÅÉÜÁÍÓÚÑ0-9][A-ZÄÖÅÉÜÁÍÓÚÑ0-9\-]{2,}(?:\s+[A-ZÄÖÅÉÜÁÍÓÚÑ0-9][A-ZÄÖÅÉÜÁÍÓÚÑ0-9\-]{2,})?\s+/u;
  for (let i = 0; i < 3; i += 1) {
    const next = t.replace(seriesPrefix, "");
    if (next === t) break;
    t = next;
  }

  const replacements = [
    [/\bcab\b/gi, "cabinet"],
    [/\bw\//gi, "with "],
    [/\bw\b(?=\s+\d)/gi, "with"],
    [/doors(\d)/gi, "doors and $1"],
    [/drawers(\d)/gi, "drawers and $1"],
    [/copperstainless/gi, "copper stainless"],
    [/stainlessbeech/gi, "stainless steel and beech"],
    [/stainlesssteelglass/gi, "stainless steel and glass"],
    [/stainlesssteelnon-stick/gi, "stainless steel non-stick"],
    [/stainlesssteelblack/gi, "stainless steel and black"],
    [/stainless steelglass/gi, "stainless steel and glass"],
    [/stainless steelbeech/gi, "stainless steel and beech"],
    [/stainless steelblack/gi, "stainless steel and black"],
    [/stainlesssteel/gi, "stainless steel"],
    [/metalwhite/gi, "metal and white"],
    [/reddark/gi, "red and dark"],
    [/glassbamboo/gi, "glass and bamboo"],
    [/glassstainless/gi, "glass stainless"],
    [/clear glassstainless/gi, "clear glass and stainless"],
    [/glassplastic/gi, "glass and plastic"],
    [/square glassplastic/gi, "square glass and plastic"],
    [/rectangularplastic/gi, "rectangular plastic"],
    [/rectangular glassplastic/gi, "rectangular glass and plastic"],
    [/whiteturquoise/gi, "white and turquoise"],
    [/greenwhite/gi, "green and white"],
    [/transparentmulticolor/gi, "clear multicolour"],
    [/^365\+\s*/i, ""],
    [/oak effect/gi, "oak-look"],
    [/ash effect/gi, "ash-look"],
    [/non-stick coating black/gi, "black non-stick"],
    [/gray/gi, "grey"],
    [/\s+,/g, ","],
    [/,\s*/g, ", "],
    [/\s+/g, " "],
  ];
  for (const [pattern, replacement] of replacements) {
    t = t.replace(pattern, replacement);
  }
  t = t.trim().replace(/^,\s*|,\s*$/g, "");
  if (!t) return "Kitchen item";
  t = t
    .replace(/^Modular kitchen set faucet/i, "Kitchen faucet")
    .replace(/^Modular kitchen set countertop/i, "Kitchen countertop");
  if (/^corner kitchen\b/i.test(t)) {
    t = t.replace(/^corner kitchen/i, "Corner modular kitchen");
  } else if (/^kitchen(?=,|$)/i.test(t)) {
    t = t.replace(/^kitchen/i, "Modular kitchen set");
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function buildTitle(series, description) {
  return humanizeKitchenTitle(`${series} ${description || "Kitchen item"}`);
}

function buildDescription(series, description, articleId, aisleTitle) {
  const name = buildTitle(series, description);
  return `${name}. Everyday kitchen piece for home use (${aisleTitle}). Add it to the same basket as your fresh produce.`;
}

async function listCatalogItems() {
  const items = [];
  const seenArticles = new Set();
  const skippedDupFiles = [];

  const folders = categoryArg
    ? FOLDER_AISLES.filter(
        (f) => f.aisleId === categoryArg || f.folder === categoryArg
      )
    : FOLDER_AISLES;

  if (!folders.length) {
    throw new Error(`Unknown --category ${categoryArg}`);
  }

  for (const { folder, aisleId, title } of folders) {
    const dir = path.join(CATALOG_ROOT, folder);
    let names;
    try {
      names = await fs.readdir(dir);
    } catch (err) {
      throw new Error(`Missing catalog folder: ${dir} (${err.message})`);
    }

    const files = names
      .filter((n) => n.toLowerCase().endsWith(".webp"))
      .filter((n) => !/banner/i.test(n))
      .sort();

    for (const file of files) {
      const parsed = parseFilename(file);
      if (!parsed) continue;
      if (seenArticles.has(parsed.articleId)) {
        skippedDupFiles.push({
          articleId: parsed.articleId,
          aisleId,
          file,
        });
        continue;
      }
      seenArticles.add(parsed.articleId);
      items.push({
        ...parsed,
        aisleId,
        aisleTitle: title,
        folder,
        file,
        absolutePath: path.join(dir, file),
        id: productId(aisleId, parsed.articleId),
      });
    }
  }

  return { items, skippedDupFiles };
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

async function loadExistingArticleIds(db) {
  const existingIds = new Set();
  const articleIds = new Set();
  let from = 0;
  const page = 1000;

  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("id")
      .eq("category", KITCHEN_WARE_CATEGORY_ID)
      .range(from, from + page - 1);
    if (error) throw error;
    const rows = data ?? [];
    for (const row of rows) {
      existingIds.add(row.id);
      const art = articleIdFromProductId(row.id);
      if (art) articleIds.add(art);
    }
    if (rows.length < page) break;
    from += page;
  }

  // Also catch article IDs if product was filed under another category
  from = 0;
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
      const art = articleIdFromProductId(row.id);
      if (art) articleIds.add(art);
    }
    if (rows.length < page) break;
    from += page;
  }

  return { existingIds, articleIds };
}

async function uploadImage(db, item) {
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

  const objectPath = `products/kitchen-ware/${item.aisleId}/${item.articleId}.webp`;
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
      (categoryArg ? ` | category=${categoryArg}` : "") +
      (limitArg ? ` | limit=${limitArg}` : "")
  );

  const { items: allItems, skippedDupFiles } = await listCatalogItems();
  const items = limitArg > 0 ? allItems.slice(0, limitArg) : allItems;

  console.log(
    `Parsed ${allItems.length} unique articles` +
      (limitArg ? ` (processing ${items.length})` : "") +
      `; skipped ${skippedDupFiles.length} cross-folder duplicates`
  );

  const byAisle = new Map();
  for (const item of items) {
    byAisle.set(item.aisleId, (byAisle.get(item.aisleId) || 0) + 1);
  }
  for (const [aisle, count] of byAisle) {
    console.log(`  • ${aisle}: ${count}`);
  }

  if (dryRun) {
    console.log("\nSample records:");
    for (const item of items.slice(0, 8)) {
      console.log(
        `  ${item.id} | ${buildTitle(item.series, item.description)} | USh ${priceFor(
          item.aisleId,
          item.articleId
        ).toLocaleString()}`
      );
    }
    return;
  }

  const db = requireSupabase();
  await ensureCategory(db);
  const { existingIds, articleIds } = await loadExistingArticleIds(db);

  const toImport = [];
  let skippedExisting = 0;
  for (const item of items) {
    if (existingIds.has(item.id) || articleIds.has(item.articleId)) {
      skippedExisting += 1;
      continue;
    }
    toImport.push(item);
  }

  console.log(
    `\nImporting ${toImport.length} (skip ${skippedExisting} existing article IDs)…`
  );

  const rows = [];
  const errors = await runPool(toImport, CONCURRENCY, async (item, index) => {
    const image = await uploadImage(db, item);
    const title = buildTitle(item.series, item.description);
    const price = priceFor(item.aisleId, item.articleId);
    rows.push(
      seedRowFromJson({
        id: item.id,
        title: `${title} – One Source`,
        price,
        originalPrice: index % 4 === 0 ? Math.round(price * 1.12) : undefined,
        rating: Number((4.2 + (Number(item.articleId) % 7) * 0.1).toFixed(1)),
        reviewCount: 12 + (Number(item.articleId) % 220),
        image,
        category: KITCHEN_WARE_CATEGORY_ID,
        unit: "each",
        prime: true,
        description: buildDescription(
          item.series,
          item.description,
          item.articleId,
          item.aisleTitle
        ),
        inStock: true,
        stockQuantity: 8 + (Number(item.articleId) % 40),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  });

  // Upsert in chunks
  let upserted = 0;
  for (let i = 0; i < rows.length; i += 80) {
    const chunk = rows.slice(i, i + 80);
    const { error } = await db.from("products").upsert(chunk, {
      onConflict: "id",
    });
    if (error) throw error;
    upserted += chunk.length;
    console.log(`  upserted ${upserted}/${rows.length}`);
  }

  if (replacePlaceholders) {
    const { data: kitchenRows, error } = await db
      .from("products")
      .select("id")
      .eq("category", KITCHEN_WARE_CATEGORY_ID);
    if (error) throw error;
    const toDelete = (kitchenRows ?? [])
      .map((r) => r.id)
      .filter((id) => isPlaceholderKitchenId(id));
    if (toDelete.length) {
      for (let i = 0; i < toDelete.length; i += 100) {
        const chunk = toDelete.slice(i, i + 100);
        const { error: delErr } = await db
          .from("products")
          .delete()
          .in("id", chunk);
        if (delErr) throw delErr;
      }
      console.log(`Removed ${toDelete.length} placeholder kitchen SKUs.`);
    }
  }

  console.log("\nDone.");
  console.log(`  imported: ${rows.length}`);
  console.log(`  skipped existing: ${skippedExisting}`);
  console.log(`  skipped cross-folder dups: ${skippedDupFiles.length}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("IKEA kitchen import failed:", err.message);
  process.exit(1);
});

/**
 * Import Jumia Uganda kitchen cookware images into kitchen-ware products.
 *
 * Source (default):
 *   /Users/user/kitchen ware/Jumia_Kitchen_Cookware
 *
 * Usage:
 *   cd server && npm run import:jumia-kitchen
 *   cd server && npm run import:jumia-kitchen -- --dry-run
 *   cd server && npm run import:jumia-kitchen -- --aisle cookware
 *   cd server && npm run import:jumia-kitchen -- --limit 20
 *
 * Product id: kitchen-{aisleId}-{sku}
 * Skips when an existing product already uses the same SKU.
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_ROOT =
  process.env.JUMIA_KITCHEN_CATALOG?.trim() ||
  "/Users/user/kitchen ware/Jumia_Kitchen_Cookware";

const dryRun = process.argv.includes("--dry-run");
const aisleArg = flagValue("--aisle") || flagValue("--category");
const limitArg = Number(flagValue("--limit") || 0);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 5));

/**
 * Jumia subcategory folder → kitchen aisle.
 * Specific folders first; unknown folders default to cookware.
 */
const FOLDER_AISLES = [
  // Organization
  {
    folder: "Jars",
    aisleId: "organization",
    title: "Organization in the kitchen",
  },
  {
    folder: "Pot_Racks",
    aisleId: "organization",
    title: "Organization in the kitchen",
  },
  {
    folder: "Coffee_Pod_Holders",
    aisleId: "organization",
    title: "Organization in the kitchen",
  },
  {
    folder: "Lids",
    aisleId: "organization",
    title: "Organization in the kitchen",
  },
  // Cookware (everything else from this Jumia scrape)
  { folder: "All_Pans", aisleId: "cookware", title: "Cookware" },
  { folder: "Bread_Pans", aisleId: "cookware", title: "Cookware" },
  { folder: "Cake_Pans", aisleId: "cookware", title: "Cookware" },
  { folder: "Chafing_Dishes", aisleId: "cookware", title: "Cookware" },
  { folder: "Chef's_Pans", aisleId: "cookware", title: "Cookware" },
  {
    folder: "Commercial_Deep_Fryers",
    aisleId: "cookware",
    title: "Cookware",
  },
  {
    folder: "Commercial_Waffle_Makers",
    aisleId: "cookware",
    title: "Cookware",
  },
  { folder: "Cookware", aisleId: "cookware", title: "Cookware" },
  {
    folder: "Cookware_Accessories",
    aisleId: "cookware",
    title: "Cookware",
  },
  { folder: "Cookware_Sets", aisleId: "cookware", title: "Cookware" },
  { folder: "Crepe_Pans", aisleId: "cookware", title: "Cookware" },
  {
    folder: "Disposable_Cookware",
    aisleId: "cookware",
    title: "Cookware",
  },
  { folder: "Double_Boilers", aisleId: "cookware", title: "Cookware" },
  { folder: "Dutch_Ovens", aisleId: "cookware", title: "Cookware" },
  { folder: "Egg_Poachers", aisleId: "cookware", title: "Cookware" },
  { folder: "Griddles", aisleId: "cookware", title: "Cookware" },
  { folder: "Grill_Pans", aisleId: "cookware", title: "Cookware" },
  { folder: "Muffin_Trays", aisleId: "cookware", title: "Cookware" },
  {
    folder: "Multipots_and_Pasta_Pots",
    aisleId: "cookware",
    title: "Cookware",
  },
  { folder: "Omelet_Pans", aisleId: "cookware", title: "Cookware" },
  { folder: "Pizza_Pans", aisleId: "cookware", title: "Cookware" },
  { folder: "Pressure_Cookers", aisleId: "cookware", title: "Cookware" },
  { folder: "Saucepans", aisleId: "cookware", title: "Cookware" },
  { folder: "Sauciers", aisleId: "cookware", title: "Cookware" },
  { folder: "Sauté_Pans", aisleId: "cookware", title: "Cookware" },
  { folder: "Serveware", aisleId: "cookware", title: "Cookware" },
  { folder: "Skillets", aisleId: "cookware", title: "Cookware" },
  { folder: "Soup_Bowls", aisleId: "cookware", title: "Cookware" },
  {
    folder: "Specialty_Cookware",
    aisleId: "cookware",
    title: "Cookware",
  },
  { folder: "Steamers", aisleId: "cookware", title: "Cookware" },
  {
    folder: "Steamers,_Stock_and_Pasta_Pots",
    aisleId: "cookware",
    title: "Cookware",
  },
  { folder: "Stockpots", aisleId: "cookware", title: "Cookware" },
  { folder: "Tagines", aisleId: "cookware", title: "Cookware" },
  { folder: "Teakettles", aisleId: "cookware", title: "Cookware" },
  {
    folder: "Toaster_Oven_Cookware",
    aisleId: "cookware",
    title: "Cookware",
  },
  {
    folder: "Woks_and_Stir-Fry_Pans",
    aisleId: "cookware",
    title: "Cookware",
  },
];

const PRICE_RANGE = {
  cookware: [18000, 380000],
  organization: [12000, 160000],
};

const FILE_RE = /^(.+)_([A-Z]{2}\d{3}[A-Z0-9]+)\.(jpe?g|webp|png)$/i;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".webp", ".png"]);

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function hashSku(sku) {
  let h = 0;
  for (let i = 0; i < sku.length; i += 1) {
    h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  }
  return h;
}

function productId(aisleId, sku) {
  return `kitchen-${aisleId}-${sku}`;
}

function skuFromProductId(id) {
  const m = String(id).match(/^kitchen-[a-z0-9-]+-([A-Z]{2}\d{3}[A-Z0-9]+)$/i);
  return m ? m[1].toUpperCase() : null;
}

function priceFor(aisleId, sku) {
  const [min, max] = PRICE_RANGE[aisleId] || [20000, 250000];
  const span = max - min;
  const stepped = min + (hashSku(sku) % Math.max(1, span));
  return Math.round(stepped / 1000) * 1000;
}

function cleanTitleFromStem(stem) {
  let t = String(stem ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Drop leading "Generic" brand noise when it is the whole brand
  t = t.replace(/^Generic\s+/i, "");

  const replacements = [
    [/\bPc\b/gi, "piece"],
    [/\bPcs\b/gi, "piece"],
    [/\bNon[\s-]?Sticky\b/gi, "non-stick"],
    [/\bNon[\s-]?Stick\b/gi, "non-stick"],
    [/\bMultiColor\b/gi, "multicolour"],
    [/\bMulti[\s-]?Colour\b/gi, "multicolour"],
    [/\bgray\b/gi, "grey"],
    [/\bcolor\b/gi, "colour"],
    [/&/g, "and"],
    [/\s*[-–—]\s*/g, " – "],
    [/\s+,/g, ","],
    [/,\s*/g, ", "],
    [/\s+/g, " "],
  ];
  for (const [pattern, replacement] of replacements) {
    t = t.replace(pattern, replacement);
  }

  t = t.trim().replace(/^[,–\s]+|[,–\s]+$/g, "");
  if (!t) return "Kitchen cookware";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function parseFilename(filename) {
  const m = filename.match(FILE_RE);
  if (!m) return null;
  return {
    stem: m[1],
    sku: m[2].toUpperCase(),
    title: cleanTitleFromStem(m[1]),
  };
}

function buildDescription(title, aisleTitle, jumiaFolder) {
  const from = jumiaFolder.replace(/_/g, " ").replace(/,/g, ",");
  return `${title}. Everyday kitchen piece for home use (${aisleTitle} · ${from}). Add it to the same basket as your fresh produce.`;
}

async function listCatalogItems() {
  const items = [];
  const seenSkus = new Set();
  const skippedDupFiles = [];
  const skippedUnknown = [];

  const folders = aisleArg
    ? FOLDER_AISLES.filter(
        (f) => f.aisleId === aisleArg || f.folder === aisleArg
      )
    : FOLDER_AISLES;

  if (!folders.length) {
    throw new Error(`Unknown --aisle ${aisleArg}`);
  }

  // Discover any folders on disk not in the map (default → cookware)
  let diskFolders = [];
  try {
    diskFolders = (await fs.readdir(CATALOG_ROOT, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch (err) {
    throw new Error(`Missing catalog root: ${CATALOG_ROOT} (${err.message})`);
  }

  const mapped = new Set(FOLDER_AISLES.map((f) => f.folder));
  const extras = diskFolders
    .filter((name) => !mapped.has(name))
    .map((folder) => ({
      folder,
      aisleId: "cookware",
      title: "Cookware",
    }));

  const allFolders = aisleArg ? folders : [...folders, ...extras];

  for (const { folder, aisleId, title } of allFolders) {
    const dir = path.join(CATALOG_ROOT, folder);
    let names;
    try {
      names = await fs.readdir(dir);
    } catch {
      continue;
    }

    const files = names
      .filter((n) => IMAGE_EXTS.has(path.extname(n).toLowerCase()))
      .sort();

    for (const file of files) {
      const parsed = parseFilename(file);
      if (!parsed) {
        skippedUnknown.push({ folder, file });
        continue;
      }
      if (seenSkus.has(parsed.sku)) {
        skippedDupFiles.push({ sku: parsed.sku, aisleId, file, folder });
        continue;
      }
      seenSkus.add(parsed.sku);
      items.push({
        ...parsed,
        aisleId,
        aisleTitle: title,
        folder,
        file,
        absolutePath: path.join(dir, file),
        id: productId(aisleId, parsed.sku),
      });
    }
  }

  return { items, skippedDupFiles, skippedUnknown };
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

async function loadExistingSkus(db) {
  const existingIds = new Set();
  const skus = new Set();
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
      const sku = skuFromProductId(row.id);
      if (sku) skus.add(sku);
    }
    if (rows.length < page) break;
    from += page;
  }

  return { existingIds, skus };
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

  const objectPath = `products/kitchen-ware/${item.aisleId}/jumia-${item.sku}.webp`;
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
      (aisleArg ? ` | aisle=${aisleArg}` : "") +
      (limitArg ? ` | limit=${limitArg}` : "")
  );

  const { items: allItems, skippedDupFiles, skippedUnknown } =
    await listCatalogItems();
  const items = limitArg > 0 ? allItems.slice(0, limitArg) : allItems;

  console.log(
    `Parsed ${allItems.length} unique SKUs` +
      (limitArg ? ` (processing ${items.length})` : "") +
      `; skipped ${skippedDupFiles.length} cross-folder duplicates` +
      `; ${skippedUnknown.length} unparseable filenames`
  );

  const byAisle = new Map();
  const byFolder = new Map();
  for (const item of items) {
    byAisle.set(item.aisleId, (byAisle.get(item.aisleId) || 0) + 1);
    byFolder.set(item.folder, (byFolder.get(item.folder) || 0) + 1);
  }
  console.log("\nBy kitchen aisle:");
  for (const [aisle, count] of [...byAisle.entries()].sort()) {
    console.log(`  • ${aisle}: ${count}`);
  }
  console.log("\nBy Jumia folder:");
  for (const [folder, count] of [...byFolder.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  • ${folder}: ${count}`);
  }

  if (dryRun) {
    console.log("\nSample records:");
    for (const item of items.slice(0, 10)) {
      console.log(
        `  ${item.id} | ${item.title} | USh ${priceFor(
          item.aisleId,
          item.sku
        ).toLocaleString()} | ${item.folder}`
      );
    }
    return;
  }

  const db = requireSupabase();
  await ensureCategory(db);
  const { existingIds, skus } = await loadExistingSkus(db);

  const toImport = [];
  let skippedExisting = 0;
  for (const item of items) {
    if (existingIds.has(item.id) || skus.has(item.sku)) {
      skippedExisting += 1;
      continue;
    }
    toImport.push(item);
  }

  console.log(
    `\nImporting ${toImport.length} (skip ${skippedExisting} existing SKUs)…`
  );

  const rows = [];
  const errors = await runPool(toImport, CONCURRENCY, async (item, index) => {
    const image = await uploadImage(db, item);
    const price = priceFor(item.aisleId, item.sku);
    const h = hashSku(item.sku);
    rows.push(
      seedRowFromJson({
        id: item.id,
        title: `${item.title} – One Source`,
        price,
        originalPrice: index % 4 === 0 ? Math.round(price * 1.12) : undefined,
        rating: Number((4.1 + (h % 8) * 0.1).toFixed(1)),
        reviewCount: 8 + (h % 180),
        image,
        category: KITCHEN_WARE_CATEGORY_ID,
        unit: "each",
        prime: true,
        description: buildDescription(
          item.title,
          item.aisleTitle,
          item.folder
        ),
        inStock: true,
        stockQuantity: 6 + (h % 36),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  });

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
  console.error("Jumia kitchen import failed:", err.message);
  process.exit(1);
});

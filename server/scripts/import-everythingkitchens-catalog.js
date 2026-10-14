/**
 * Import the Everything Kitchens (US) catalogue into the Kitchen shop aisles.
 *
 * Source (default):
 *   /Users/user/everythingkitchens-scraper/products/products.csv (+ image folders)
 *
 * Usage:
 *   cd server && npm run import:everythingkitchens
 *   cd server && npm run import:everythingkitchens -- --dry-run
 *   cd server && npm run import:everythingkitchens -- --aisle small-appliances
 *   cd server && npm run import:everythingkitchens -- --reuse-images --limit 50
 *
 * Prices: kitchenShelfPrice() in ugandanKitchenPrices.js — small appliances at
 * US price × 3,700 × 1.05, everything else at the Kampala shelf-price band capped
 * at landed cost × 1.15. The feed has no crossed-out prices, so no was-price.
 * Listings without a source price (discontinued / bundle-only) are skipped.
 *
 * Product id: kitchen-{aisleId}-ek-{urlSlug}
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { KITCHEN_WARE_AISLES, KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";
import { kitchenShelfPrice } from "../lib/ugandanKitchenPrices.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_CSV =
  process.env.EK_CATALOG?.trim() ||
  "/Users/user/everythingkitchens-scraper/products/products.csv";
const CATALOG_ROOT = path.dirname(CATALOG_CSV);

const dryRun = process.argv.includes("--dry-run");
const reuseImages = process.argv.includes("--reuse-images");
const aisleArg = flagValue("--aisle");
const limitArg = Number(flagValue("--limit") || 0);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 10));
const UPSERT_CHUNK = 200;

const AISLE_TITLES = Object.fromEntries(KITCHEN_WARE_AISLES.map((a) => [a.id, a.title]));

/** Food, décor and garden lines that do not belong in the Kitchen shop. */
const SKIP_CATEGORY = [
  /^Cooks' Tools \/ Pantry/,
  /^Lifestyle\b/,
  /^Homesteading & Outdoor \/ Gardening/,
  /^Other \/ Gifts for Her/,
];
const SKIP_TITLE = /ice cream mix|\byeast\b/i;

const APPLIANCE_TITLE =
  /stand mixer|hand mixer|blender|food processor|coffee maker|espresso|frother|grinder|kettle|toaster|air fryer|deep fryer|slow cooker|multi ?cooker|rice cooker|bread maker|waffle|ice cream maker|dehydrator|grain mill|juicer|vitamix|kitchenaid|freeze dryer|distiller/i;

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
  if (/emile henry|mackenzie-childs/i.test(title)) return "cookware";
  if (/cast iron|enamel/i.test(title)) return "cast-iron";
  if (/carbon steel/i.test(title)) return "carbon-steel";
  if (/non-?stick|ceramic|hard anodized/i.test(title)) return "non-stick";
  if (/stainless|clad|tri-?ply|\bd3\b|\bd5\b|copper core/i.test(title)) return "stainless-clad";
  if (/\bstaub\b|le creuset|\blodge\b/i.test(title)) return "cast-iron";
  return fallback;
}

/** Map an Everything Kitchens category path onto a One Source Kitchen aisle. */
function aisleFor(category, title, allCategories) {
  const [top = "", sub = ""] = category.split(" / ");
  const haystack = `${title} ${allCategories}`;
  if (/pressure (canner|cooker)/i.test(title)) return "cookware";

  switch (top) {
    case "Small Appliances":
      return "small-appliances";
    case "Cookware":
      if (/Lids & Accessories|Pot Racks|Microwave Cookers/.test(category)) {
        return "cookware-accessories";
      }
      if (sub === "Dutch Ovens & Braisers") return cookwareMaterialAisle(title, "cast-iron");
      return cookwareMaterialAisle(title, "cookware");
    case "Glassware & Tabletop":
      if (/Oven Mitts|Kitchen Towels|Aprons/.test(category)) return "cookware-accessories";
      return "tabletop";
    case "Cooks' Tools":
      if (/Coffee & Tea|Bar Tools/.test(category)) return "tabletop";
      return "cookware-accessories";
    case "Bakeware":
    case "Knives":
      return "cookware-accessories";
    case "Organization":
      return "organization";
    case "Homesteading & Outdoor":
      if (/Food Processing|Meat Grinders/.test(category)) return "small-appliances";
      return "cookware-accessories";
    default:
      if (APPLIANCE_TITLE.test(haystack) && !/attachment|jar|bowl|lid|blade/i.test(title)) {
        return "small-appliances";
      }
      if (/attachment|mixer|vitamix/i.test(haystack)) return "small-appliances";
      if (/dinnerware|place setting|fiesta|glass|bormioli|plate|bowl|mug|tablecraft/i.test(haystack)) {
        return "tabletop";
      }
      if (/stainless cookware|skillet|saucepan|dutch oven|pot\b/i.test(haystack)) {
        return cookwareMaterialAisle(title, "cookware");
      }
      if (/storage|container|organizer/i.test(haystack)) return "organization";
      return "cookware-accessories";
  }
}

function cleanTitle(raw) {
  return String(raw ?? "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(['/])/g, "$1")
    .replace(/[®™]/g, "")
    .replace(/\s*\|\s*/g, " – ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugFromUrl(url) {
  const base = String(url).split("/").pop().replace(/\.html?$/i, "").toLowerCase();
  const slug = base.replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug.length <= 70 ? slug : `${slug.slice(0, 60)}-${hashStr(slug).toString(36)}`;
}

function priceFor(item) {
  return kitchenShelfPrice({
    id: item.id,
    title: item.title,
    brand: item.brand,
    aisleId: item.aisleId,
    usd: item.usd,
  }).price;
}

async function listCatalogItems() {
  const rows = parseCsv(await fs.readFile(CATALOG_CSV, "utf8"));
  const items = [];
  const seen = new Set();
  let skipped = 0;

  for (const row of rows) {
    const category = row.category.trim();
    if (SKIP_CATEGORY.some((re) => re.test(category))) {
      skipped += 1;
      continue;
    }
    const title = cleanTitle(row.name);
    if (!title || !row.image_file || !(Number(row.price) > 0) || SKIP_TITLE.test(title)) {
      skipped += 1;
      continue;
    }
    const aisleId = aisleFor(category, title, row.all_categories || "");
    if (aisleArg && aisleId !== aisleArg) continue;

    const id = `kitchen-${aisleId}-ek-${slugFromUrl(row.url)}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const item = {
      id,
      slug: slugFromUrl(row.url),
      title,
      brand: cleanTitle(row.brand),
      aisleId,
      leaf: category.split(" / ").pop(),
      usd: Number(row.price) || 0,
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

/** Drop listings from earlier runs whose id changed (e.g. moved to another aisle). */
async function pruneStale(db, existingIds, currentIds) {
  const stale = [...existingIds].filter((id) => !currentIds.has(id));
  for (let i = 0; i < stale.length; i += 100) {
    const { error } = await db.from("products").delete().in("id", stale.slice(i, i + 100));
    if (error) throw error;
  }
  if (stale.length) console.log(`Removed ${stale.length} stale Everything Kitchens listings`);
}

async function loadExistingImages(db) {
  const images = new Map();
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("products")
      .select("id,image")
      .like("id", "kitchen-%-ek-%")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data ?? []) images.set(row.id, row.image);
    if ((data ?? []).length < 1000) break;
    from += 1000;
  }
  return images;
}

async function uploadImage(db, item) {
  const optimized = await sharp(await fs.readFile(item.localPath))
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const objectPath = `products/kitchen-ware/${item.aisleId}/ek-${item.slug}.webp`;
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
      done += 1;
      if (done % 50 === 0 || done === items.length) {
        console.log(`  … ${done}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return errors;
}

function describe(item) {
  const brand = item.brand ? `${item.brand} ` : "";
  return `${item.title}. ${brand}${item.leaf.toLowerCase()} for home kitchens (${
    AISLE_TITLES[item.aisleId] ?? "Kitchen"
  }). Add it to the same basket as your fresh produce.`;
}

async function main() {
  console.log(`Catalog: ${CATALOG_CSV}`);
  console.log(
    `Mode: ${dryRun ? "dry-run" : "import"} | concurrency=${CONCURRENCY}` +
      (reuseImages ? " | reuse-images" : "") +
      (aisleArg ? ` | aisle=${aisleArg}` : "") +
      (limitArg ? ` | limit=${limitArg}` : "")
  );

  const { items: allItems, rowCount, skipped } = await listCatalogItems();
  const items = limitArg > 0 ? allItems.slice(0, limitArg) : allItems;
  console.log(`CSV rows: ${rowCount} → ${allItems.length} products (skipped ${skipped})`);

  const byAisle = new Map();
  for (const item of items) byAisle.set(item.aisleId, (byAisle.get(item.aisleId) || 0) + 1);
  console.log("\nBy kitchen aisle:");
  for (const [aisle, count] of [...byAisle.entries()].sort()) {
    console.log(`  • ${aisle}: ${count}`);
  }

  if (dryRun) {
    console.log("\nSample records:");
    const samples = [...byAisle.keys()].flatMap((a) => items.filter((i) => i.aisleId === a).slice(0, 3));
    for (const item of samples) {
      console.log(`  ${item.id}\n    ${item.title} | USh ${item.price.toLocaleString()} ($${item.usd})`);
    }
    return;
  }

  const db = requireSupabase();
  await ensureCategory(db);
  const existingImages = await loadExistingImages(db);
  if (!aisleArg && !limitArg) {
    await pruneStale(db, existingImages.keys(), new Set(allItems.map((i) => i.id)));
  }
  if (!reuseImages) existingImages.clear();

  const seedRows = [];
  const errors = await runPool(items, CONCURRENCY, async (item) => {
    const image = existingImages.get(item.id) || (await uploadImage(db, item));
    const h = hashStr(item.id);
    seedRows.push(
      seedRowFromJson({
        id: item.id,
        title: `${item.title} – One Source`,
        price: item.price,
        rating: Number((4.4 + (h % 5) * 0.1).toFixed(1)),
        reviewCount: 18 + (h % 140),
        image,
        category: KITCHEN_WARE_CATEGORY_ID,
        unit: "each",
        prime: true,
        description: describe(item),
        inStock: true,
        stockQuantity: 4 + (h % 20),
        delivery: "FREE same-day delivery on orders over USh 100,000",
      })
    );
  });

  let upserted = 0;
  for (let i = 0; i < seedRows.length; i += UPSERT_CHUNK) {
    const chunk = seedRows.slice(i, i + UPSERT_CHUNK);
    const { error } = await db.from("products").upsert(chunk, { onConflict: "id" });
    if (error) throw error;
    upserted += chunk.length;
    console.log(`  upserted ${upserted}/${seedRows.length}`);
  }

  console.log("\nDone.");
  console.log(`  imported: ${seedRows.length}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Everything Kitchens import failed:", err.message);
  process.exit(1);
});

/**
 * Import the Boots luxury beauty catalogue into the Cosmetics shop.
 *
 * Source (default):
 *   /Users/user/Desktop/boots-luxury-skincare/products.json (+ images/)
 *
 * Usage:
 *   cd server && npm run import:boots
 *   cd server && npm run import:boots -- --dry-run
 *   cd server && npm run import:boots -- --hidden        (import with in_stock=false)
 *   cd server && npm run import:boots -- --reuse-images --limit 50
 *
 * Price: GBP × BOOTS_GBP_TO_UGX (default 4700) × 1.5, rounded to USh 500.
 * Product id: cosmetics-{aisleId}-boots-{bootsId}
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const CATALOG_JSON =
  process.env.BOOTS_CATALOG?.trim() ||
  "/Users/user/Desktop/boots-luxury-skincare/products.json";
const CATALOG_ROOT = path.dirname(CATALOG_JSON);
const COSMETICS_CATEGORY_ID = "cosmetics";
const GBP_TO_UGX = Number(process.env.BOOTS_GBP_TO_UGX || 4700);
const MARKUP = 1.5;

const dryRun = process.argv.includes("--dry-run");
const hidden = process.argv.includes("--hidden");
const reuseImages = process.argv.includes("--reuse-images");
const limitArg = Number(flagValue("--limit") || 0);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 10));
const UPSERT_CHUNK = 200;

/** Home and wellness items that do not belong in a cosmetics shop. */
const EXCLUDED_TYPES = new Set([
  "candle",
  "reed diffuser",
  "aroma diffuser",
  "essential oils",
  "tote bag",
  "novelty gifts",
  "skin vitamins",
  "eye health",
]);

/** Keep ids in sync with src/data/cosmetics.ts. First match wins. */
const TYPE_RULES = [
  ["kits-bundles", /gift set|lip kit|travel system|makeup palette|face palette/],
  ["brushes-tools", /brush|sponge|blender|puff|mirror|tweezers|curler|sharpener|scissors|wash bag|bottle|gloves|cleaner|eyelash glue|false eyelashes/],
  ["sun-protection", /sun cream|spf|aftersun|tanning oil/],
  ["lips", /\blip|lipstick/],
  ["eye-makeup", /mascara|eyeliner|eyeshadow|brow|lash|eyebrow/],
  ["face-makeup", /foundation|concealer|powder|blush|bronzer|highlighter|contour|primer|setting spray|colour corrector|skin tint|tinted moisturiser|cc cream|bb cream|cheek tint|blemish stick/],
  ["acne-care", /spot treatment|blemish|acne/],
  ["serums-oils", /serum|face oil|dark spot corrector/],
  ["cleansers-bars", /cleans|face wash|micellar|make up remover|exfoliator|scrub|face wipes|toner/],
  ["face-eye-care", /moisturiser|face cream|day cream|night cream|eye cream|eye gel|eye mask|neck cream|firming|face mask|clay mask|lip mask|mist|hydration|barrier cream|cooling pads/],
  ["hair-baby-more", /shampoo|conditioner|hair|nail|top coat|base coat|perfume|body spray|aftershave|shaving/],
  ["body-care", /body|hand|shower|bath|deodorant|antiperspirant|tan|stretch mark/],
];

const FRAGRANCE_TITLE = /eau de|cologne|parfum|perfume|fragrance/i;
const KIT_TITLE = /\b(gift set|set|kit|collection|duo|trio)\b/i;

const TITLE_RULES = [
  ["kits-bundles", KIT_TITLE],
  ["eye-makeup", /eyeshadow palette|eye palette/i],
  ["face-makeup", /palette/i],
  ["sun-protection", /\bspf\b|sunscreen|sun cream/i],
  ["brushes-tools", /\bbrush|sponge\b/i],
  ["lips", /\blip/i],
  ["eye-makeup", /mascara|eyeliner|eyeshadow|brow|lash/i],
  ["face-makeup", /foundation|concealer|powder|blush|bronzer|highlight|primer|setting spray/i],
  ["serums-oils", /serum|oil\b/i],
  ["cleansers-bars", /cleans|wash|toner|micellar|exfoliat/i],
  ["face-eye-care", /cream|moisturi[sz]er|mask|eye|face/i],
  ["hair-baby-more", /hair|shampoo|conditioner|parfum|perfume|nail/i],
  ["body-care", /./],
];

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function typesOf(product) {
  const raw = Array.isArray(product.productType) ? product.productType : [product.productType];
  return raw.map((t) => String(t ?? "").trim().toLowerCase()).filter(Boolean);
}

function resolveAisle(product, types) {
  const title = String(product.title ?? "");
  if (FRAGRANCE_TITLE.test(title)) return "hair-baby-more";
  if (KIT_TITLE.test(title) && (types.includes("gift set") || /gift set/i.test(title))) {
    return "kits-bundles";
  }
  // Scraped type lists are noisy; the first type is the product's main one.
  for (const type of types) {
    const hit = TYPE_RULES.find(([, re]) => re.test(type));
    if (hit) return hit[0];
  }
  return TITLE_RULES.find(([, re]) => re.test(title))[0];
}

function cleanTitle(title) {
  return String(title ?? "").replace(/\s+/g, " ").trim();
}

function priceUgx(gbp) {
  return Math.max(500, Math.round((gbp * GBP_TO_UGX * MARKUP) / 500) * 500);
}

function unitFor(size) {
  const s = String(size ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(\d[\d.,]*)(ml|g|kg|l|oz|pcs)$/);
  if (!m) return "each";
  const amount = Number(m[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1500) return "each";
  return s;
}

function describe(item) {
  const type = item.types[0] ? item.types[0] : "beauty product";
  const size = item.unit !== "each" ? ` (${item.unit})` : "";
  return `${item.title}${size}. Authentic ${item.brand} ${type} from our luxury beauty range, delivered with your One Source order.`;
}

async function listCatalogItems() {
  const raw = JSON.parse(await fs.readFile(CATALOG_JSON, "utf8"));
  const products = Array.isArray(raw) ? raw : raw.products ?? [];
  const items = [];
  const skipped = { excluded: 0, noPrice: 0, noImage: 0 };

  for (const product of products) {
    const types = typesOf(product);
    if (types.some((t) => EXCLUDED_TYPES.has(t))) {
      skipped.excluded += 1;
      continue;
    }
    const gbp = Number(product.priceValue);
    if (!Number.isFinite(gbp) || gbp <= 0) {
      skipped.noPrice += 1;
      continue;
    }
    const image = (product.images ?? []).find((img) => img.local_path);
    if (!image) {
      skipped.noImage += 1;
      continue;
    }
    const aisleId = resolveAisle(product, types);
    const bootsId = String(product.id).replace(/[^a-z0-9]/gi, "");
    const item = {
      id: `cosmetics-${aisleId}-boots-${bootsId}`,
      bootsId,
      aisleId,
      types,
      brand: cleanTitle(product.brand) || "Luxury",
      title: cleanTitle(product.title),
      gbp,
      price: priceUgx(gbp),
      unit: unitFor(product.size),
      absolutePath: path.join(CATALOG_ROOT, image.local_path),
    };
    item.description = describe(item);
    items.push(item);
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
  return `products/cosmetics/${item.aisleId}/boots-${item.bootsId}.webp`;
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
  const seed = Number(item.bootsId.slice(-4)) || item.title.length;
  return seedRowFromJson({
    id: item.id,
    title: `${item.title} – One Source`,
    price: item.price,
    rating: Number((4.2 + (seed % 8) * 0.1).toFixed(1)),
    reviewCount: 6 + (seed % 150),
    image,
    category: COSMETICS_CATEGORY_ID,
    unit: item.unit,
    prime: true,
    description: item.description,
    inStock: !hidden,
    stockQuantity: 15,
    delivery: "FREE same-day delivery on orders over USh 100,000",
  });
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
      if (done % 100 === 0 || done === items.length) console.log(`  … ${done}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return errors;
}

async function main() {
  console.log(`Catalog: ${CATALOG_JSON}`);
  console.log(
    `Mode: ${dryRun ? "dry-run" : "import"} | £1 = USh ${GBP_TO_UGX} × ${MARKUP}` +
      (hidden ? " | hidden" : "") +
      (reuseImages ? " | reuse-images" : "")
  );

  const { items: allItems, skipped } = await listCatalogItems();
  const items = limitArg > 0 ? allItems.slice(0, limitArg) : allItems;

  console.log(`Parsed ${allItems.length} products (processing ${items.length})`);
  console.log(
    `Skipped: excluded=${skipped.excluded} noPrice=${skipped.noPrice} noImage=${skipped.noImage}`
  );

  const byAisle = new Map();
  for (const item of items) byAisle.set(item.aisleId, [...(byAisle.get(item.aisleId) ?? []), item]);
  for (const [aisle, list] of [...byAisle.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  • ${aisle}: ${list.length}`);
    if (dryRun) {
      for (const item of list.slice(0, 6)) {
        console.log(
          `      £${item.gbp} → USh ${item.price.toLocaleString()} | ${item.unit} | [${item.types.join(", ")}] ${item.title}`
        );
      }
    }
  }

  if (dryRun) {
    let missing = 0;
    for (const item of items) {
      await fs.access(item.absolutePath).catch(() => (missing += 1));
    }
    console.log(`\nMissing image files: ${missing}`);
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
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    await withRetries(
      async () => {
        const { error } = await db.from("products").upsert(chunk, { onConflict: "id" });
        if (error) throw error;
      },
      { attempts: 6, label: `upsert ${i}` }
    );
    console.log(`  upserted ${Math.min(i + UPSERT_CHUNK, rows.length)}/${rows.length}`);
  }

  console.log("\nDone.");
  console.log(`  imported: ${rows.length}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Boots import failed:", err.message);
  process.exit(1);
});

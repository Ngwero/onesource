/**
 * Import Lookfantastic / Cult Beauty products (from a folder of downloaded
 * product photos) into the Cosmetics shop. Both sites share one platform.
 *
 * Source (default): /Users/user/Downloads/{lookfantastic,cultbeauty}-images/images
 *   Files named original_{productId}-{imageId}.jpg are product photos; the
 *   product name, brand and price are looked up on the site and cached in
 *   products.json next to the images folder.
 *
 * Usage:
 *   cd server && npm run import:lookfantastic -- --dry-run
 *   cd server && npm run import:lookfantastic -- --site cultbeauty --dry-run
 *   cd server && npm run import:lookfantastic -- --hidden   (import with in_stock=false)
 *   cd server && npm run import:lookfantastic -- --refresh  (re-fetch product details)
 *
 * Price: GBP × BOOTS_GBP_TO_UGX (default 4700) × 1.5, rounded to USh 500.
 * Product id: cosmetics-{aisleId}-{lf|cb}-{productId}
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";

const SITES = {
  lookfantastic: {
    origin: "https://www.lookfantastic.com",
    tag: "lf",
    images: "/Users/user/Downloads/lookfantastic-images/images",
  },
  cultbeauty: {
    origin: "https://www.cultbeauty.co.uk",
    tag: "cb",
    images: "/Users/user/Downloads/cultbeauty-images/images",
  },
};
const siteArg = process.argv.includes("--site")
  ? process.argv[process.argv.indexOf("--site") + 1]
  : "lookfantastic";
const SITE = SITES[siteArg];
if (!SITE) {
  console.error(`Unknown --site ${siteArg} (use ${Object.keys(SITES).join(" or ")})`);
  process.exit(1);
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const IMAGES_DIR = process.env.PRODUCT_IMAGES?.trim() || SITE.images;
const CACHE_JSON = path.join(path.dirname(IMAGES_DIR), "products.json");
const COSMETICS_CATEGORY_ID = "cosmetics";
const GBP_TO_UGX = Number(process.env.BOOTS_GBP_TO_UGX || 4700);
const MARKUP = 1.5;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36";

const dryRun = process.argv.includes("--dry-run");
const hidden = process.argv.includes("--hidden");
const refresh = process.argv.includes("--refresh");

/** Retailer-own items and supplements we cannot stock. */
const EXCLUDED_TITLE = /cult beauty|lookfantastic|merch kit|cellular hydration|supplement|capsules|gummies/i;

/** Keep ids in sync with src/data/cosmetics.ts. First match wins. */
const AISLE_RULES = [
  ["hair-baby-more", /eau de|cologne|parfum|perfume|fragrance|body mist|aftershave|d\.s\. & durga|ombr[ée] leather/i],
  ["sun-protection", /\bspf\b|sunscreen|sun cream|anthelios|uvmune|sun fluid|after sun/i],
  ["brushes-tools", /hair dryer|air styler|straightener|massage gun|\bbrush|sponge|blender|curler|tweezer|device|roller|gua sha/i],
  ["kits-bundles", /\(worth|gift set|collective/i],
  ["hair-baby-more", /shampoo|conditioner|color protect|colour protect|\bhair|dream coat|dream clean|texture|finishing spray|curl|scalp|styling|volumi[sz]er|masque|blow ?dry|heat protect|keratin|bond repair|olaplex|nail/i],
  ["kits-bundles", /gift set|\bkit\b|\bset\b|collection|advent|calendar|duo|trio|essentials|routine|bundle/i],
  ["lips", /\blip|lipstick|gloss|prada \w+ balm/i],
  ["eye-makeup", /mascara|eyeliner|eyeshadow|eye shadow|brow|lash/i],
  ["face-makeup", /foundation|concealer|powder|blush|bronzer|contour|skinstick|highlight|primer|setting spray|skin tint|bb cream|cc cream|palette|lighting edit|kamo drops|bronzing drops/i],
  ["acne-care", /blemish|acne|spot/i],
  ["serums-oils", /serum|ampoule|essence|face oil|\boil\b|retinol|vitamin c|lactic acid|good genes/i],
  ["cleansers-bars", /cleans|face wash|toner|micellar|exfoliat|peel|cleansing/i],
  ["body-care", /body|hand|shower|bath|deodorant|lotion|butter|scrub/i],
  ["face-eye-care", /cream|moisturi[sz]er|mask|eye|face|gel|mist|balm|fluid/i],
  ["body-care", /./],
];

function cleanText(text) {
  return String(text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function priceUgx(gbp) {
  return Math.max(500, Math.round((gbp * GBP_TO_UGX * MARKUP) / 500) * 500);
}

function unitFromTitle(title) {
  const m = title.match(/(\d+(?:[.,]\d+)?)\s?(ml|g|kg|l)\b/i);
  if (!m) return "each";
  const amount = Number(m[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1500) return "each";
  return `${m[1].replace(",", ".")}${m[2].toLowerCase()}`;
}

async function listProductPhotos() {
  const files = (await fs.readdir(IMAGES_DIR)).filter((f) => /^original_\d+-\d+\.(jpe?g|png|webp)$/i.test(f));
  const byProduct = new Map();
  for (const file of files.sort()) {
    const productId = file.match(/^original_(\d+)-/)[1];
    byProduct.set(productId, [...(byProduct.get(productId) ?? []), file]);
  }
  return byProduct;
}

async function fetchProductDetails(productId) {
  const res = await fetch(`${SITE.origin}/p/${productId}/`, {
    headers: { "user-agent": USER_AGENT, "accept-language": "en-GB" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const group = blocks.find((b) => b["@type"] === "ProductGroup" || b["@type"] === "Product");
  if (!group) throw new Error("no product data on page");
  const variants = group.hasVariant ?? [group];
  const variant = variants.find((v) => String(v.sku) === productId) ?? variants[0];
  const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList")?.itemListElement ?? [];
  const crumbNames = crumbs.map((c) => cleanText(c.name ?? c.item?.name));
  const brand = crumbNames[1] === "Brands" ? crumbNames[2] : cleanText(group.brand?.name);
  const offers = Array.isArray(variant.offers) ? variant.offers : [variant.offers].filter(Boolean);
  const offer = offers.find((o) => String(o.sku) === productId) ?? offers[0];
  const gbp = Number(offer?.price);
  // The page lists price/rrp pairs for many products; only trust an rrp paired with this price.
  const rrp = [
    ...html.matchAll(/"price":\{"currency":"GBP","amount":"([\d.]+)"[^}]*\},"rrp":\{"currency":"GBP","amount":"([\d.]+)"/g),
  ]
    .map((m) => ({ price: Number(m[1]), rrp: Number(m[2]) }))
    .find((pair) => Math.abs(pair.price - gbp) < 0.005)?.rrp;
  const primaryImage = String(variant.image ?? group.image ?? "").match(/original\/(\d+-\d+)\.\w+/)?.[1];

  return {
    productId,
    title: cleanText(variant.name ?? group.name),
    brand: brand || "",
    gbp,
    rrpGbp: Number.isFinite(rrp) ? rrp : null,
    breadcrumbs: crumbNames,
    primaryImage: primaryImage ?? null,
    rating: Number(group.aggregateRating?.ratingValue) || null,
  };
}

async function loadDetails(productIds) {
  let cache = {};
  if (!refresh) cache = JSON.parse(await fs.readFile(CACHE_JSON, "utf8").catch(() => "{}"));
  const missing = productIds.filter((id) => !cache[id]);
  if (missing.length) console.log(`Fetching details for ${missing.length} products…`);
  for (const id of missing) {
    try {
      cache[id] = await fetchProductDetails(id);
      console.log(`  ✓ ${id} ${cache[id].title} £${cache[id].gbp}`);
    } catch (err) {
      console.warn(`  ✗ ${id}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  await fs.writeFile(CACHE_JSON, JSON.stringify(cache, null, 2));
  return cache;
}

function resolveAisle(details) {
  const text = `${details.title} ${details.breadcrumbs.slice(2, -1).join(" ")}`;
  return AISLE_RULES.find(([, re]) => re.test(text))[0];
}

function describe(item) {
  const size = item.unit !== "each" ? ` (${item.unit})` : "";
  return `${item.title}${size}. Authentic ${item.brand || "luxury"} beauty from our premium range, delivered with your One Source order.`;
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

async function uploadImage(db, item) {
  const objectPath = `products/cosmetics/${item.aisleId}/${SITE.tag}-${item.productId}.webp`;
  const optimized = await sharp(await fs.readFile(item.absolutePath))
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const { error } = await db.storage.from(BUCKET).upload(objectPath, optimized, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
  return db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

function buildProductRow(item, image) {
  const seed = Number(item.productId.slice(-4)) || item.title.length;
  return seedRowFromJson({
    id: item.id,
    title: `${item.title} – One Source`,
    price: item.price,
    originalPrice: item.originalPrice,
    rating: item.rating ?? Number((4.2 + (seed % 8) * 0.1).toFixed(1)),
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

async function main() {
  console.log(`Site: ${SITE.origin} | Images: ${IMAGES_DIR}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "import"} | £1 = USh ${GBP_TO_UGX} × ${MARKUP}${hidden ? " | hidden" : ""}`);

  const photos = await listProductPhotos();
  const details = await loadDetails([...photos.keys()]);

  const items = [];
  const skipped = [];
  for (const [productId, files] of photos) {
    const d = details[productId];
    if (!d || !d.title || !Number.isFinite(d.gbp) || d.gbp <= 0 || EXCLUDED_TITLE.test(d.title)) {
      skipped.push(productId);
      continue;
    }
    const primary = files.find((f) => d.primaryImage && f.includes(d.primaryImage)) ?? files[0];
    const aisleId = resolveAisle(d);
    const price = priceUgx(d.gbp);
    const worthGbp = Number(d.title.match(/worth (?:over )?£([\d,.]+)/i)?.[1]?.replace(/,/g, ""));
    const listGbp = Math.max(d.rrpGbp ?? 0, Number.isFinite(worthGbp) ? worthGbp : 0) || null;
    const rrp = listGbp && listGbp > d.gbp ? priceUgx(listGbp) : null;
    const item = {
      id: `cosmetics-${aisleId}-${SITE.tag}-${productId}`,
      productId,
      aisleId,
      brand: d.brand,
      title: d.title,
      gbp: d.gbp,
      price,
      originalPrice: rrp && rrp > price ? rrp : null,
      rating: d.rating ? Number(Math.min(5, d.rating).toFixed(1)) : null,
      unit: unitFromTitle(d.title),
      absolutePath: path.join(IMAGES_DIR, primary),
    };
    item.description = describe(item);
    items.push(item);
  }

  console.log(`\nProducts: ${items.length} (skipped ${skipped.length}${skipped.length ? `: ${skipped.join(", ")}` : ""})`);
  for (const item of items.sort((a, b) => a.aisleId.localeCompare(b.aisleId))) {
    const was = item.originalPrice ? ` (was ${item.originalPrice.toLocaleString()})` : "";
    console.log(`  • ${item.aisleId.padEnd(15)} £${item.gbp} → USh ${item.price.toLocaleString()}${was} | ${item.title}`);
  }
  if (dryRun) return;

  const db = requireSupabase();
  await ensureCategory(db);
  const rows = [];
  for (const item of items) {
    try {
      rows.push(buildProductRow(item, await uploadImage(db, item)));
    } catch (err) {
      console.error(`  ✗ ${item.id}: ${err.message}`);
    }
  }
  const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  console.log(`\nDone. imported: ${rows.length}`);
}

main().catch((err) => {
  console.error(`${siteArg} import failed:`, err.message);
  process.exit(1);
});

/**
 * Supplier (source) prices for imported Kitchen and Cosmetics listings, keyed by
 * One Source product id, read from the same local catalogues the importers use.
 *
 *   { gbp } for UK sources (Cookwarestore, Made In UK, Lookfantastic, Cult Beauty, Boots)
 *   { usd } for Everything Kitchens
 *   wasGbp / wasUsd when the source showed a real crossed-out price
 *
 * Paths can be overridden with the importers' env vars.
 */
import fs from "fs";

const CWS_CSV =
  process.env.CWS_CATALOG?.trim() || "/Users/user/cookwarestore-scraper/products/products.csv";
const EK_CSV =
  process.env.EK_CATALOG?.trim() || "/Users/user/everythingkitchens-scraper/products/products.csv";
const LF_FOLDER_JSON = `${
  process.env.LF_FOLDER?.trim() || "/Users/user/lookfantastic-products/all-products"
}/products.json`;
const LF_LEGACY_JSON = "/Users/user/Downloads/lookfantastic-images/products.json";
const CB_LEGACY_JSON = "/Users/user/Downloads/cultbeauty-images/products.json";
const BOOTS_JSON =
  process.env.BOOTS_CATALOG?.trim() || "/Users/user/Desktop/boots-luxury-skincare/products.json";
const MADEIN_SHOP_JSON =
  process.env.MADEIN_SHOP_JSON?.trim() ||
  "https://www.madeincookware.co.uk/collections/shop-all/products.json";

/** Minimal RFC 4180 parser (quoted fields, escaped quotes, embedded newlines). */
export function parseCsv(text) {
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

function money(text) {
  const n = Number(String(text ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function hash31(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Same slug as import-everythingkitchens-catalog.js. */
function ekSlugFromUrl(url) {
  const base = String(url).split("/").pop().replace(/\.html?$/i, "").toLowerCase();
  const slug = base.replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug.length <= 70 ? slug : `${slug.slice(0, 60)}-${hash31(slug).toString(36)}`;
}

/** Cookwarestore article id → { gbp, wasGbp }. */
export function loadCookwarestorePrices() {
  const map = new Map();
  if (!fs.existsSync(CWS_CSV)) return map;
  for (const row of parseCsv(fs.readFileSync(CWS_CSV, "utf8"))) {
    const gbp = money(row.price);
    if (!row.product_id || !gbp || map.has(row.product_id)) continue;
    const was = money(row.old_price);
    map.set(row.product_id, { gbp, wasGbp: was && was > gbp ? was : null, brand: null });
  }
  return map;
}

/** Everything Kitchens slug → { usd, brand }. */
export function loadEverythingKitchensPrices() {
  const map = new Map();
  if (!fs.existsSync(EK_CSV)) return map;
  for (const row of parseCsv(fs.readFileSync(EK_CSV, "utf8"))) {
    const usd = money(row.price);
    if (!row.url || !usd) continue;
    const slug = ekSlugFromUrl(row.url);
    if (!map.has(slug)) map.set(slug, { usd, brand: row.brand || null });
  }
  return map;
}

/** Made In UK Shopify feed: variant id → { gbp, wasGbp }. Empty map when offline. */
export async function loadMadeInPrices() {
  const map = new Map();
  try {
    for (let page = 1; page <= 10; page += 1) {
      const res = await fetch(`${MADEIN_SHOP_JSON}?limit=250&page=${page}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });
      if (!res.ok) break;
      const { products = [] } = await res.json();
      for (const p of products) {
        for (const v of p.variants ?? []) {
          const gbp = money(v.price);
          const was = money(v.compare_at_price);
          if (gbp) map.set(String(v.id), { gbp, wasGbp: was && was > gbp ? was : null, brand: "Made In" });
        }
      }
      if (products.length < 250) break;
    }
  } catch {
    /* offline: Made In rows fall back to their current price */
  }
  return map;
}

/** Lookfantastic (folder crawl + legacy image import), Cult Beauty and Boots → { gbp, wasGbp, brand }. */
export function loadCosmeticsPrices() {
  const lf = new Map();
  const cb = new Map();
  const boots = new Map();

  const folder = readJson(LF_FOLDER_JSON) ?? [];
  for (const p of folder) {
    const own = p.variants?.find((v) => String(v.sku) === String(p.id));
    const gbp = Number(own?.price ?? p.price_min);
    if (!(gbp > 0)) continue;
    const name = String(p.name ?? "");
    const worth = Number(name.match(/worth (?:over )?£([\d,.]+)/i)?.[1]?.replace(/,/g, ""));
    lf.set(String(p.id), {
      gbp,
      wasGbp: Number.isFinite(worth) && worth > gbp ? worth : null,
      brand: p.brand || null,
    });
  }

  for (const [file, map] of [
    [LF_LEGACY_JSON, lf],
    [CB_LEGACY_JSON, cb],
  ]) {
    const legacy = readJson(file) ?? {};
    for (const d of Object.values(legacy)) {
      const gbp = Number(d?.gbp);
      if (!(gbp > 0) || map.has(String(d.productId))) continue;
      const worth = Number(String(d.title ?? "").match(/worth (?:over )?£([\d,.]+)/i)?.[1]?.replace(/,/g, ""));
      const was = Math.max(Number(d.rrpGbp) || 0, Number.isFinite(worth) ? worth : 0);
      map.set(String(d.productId), { gbp, wasGbp: was > gbp ? was : null, brand: d.brand || null });
    }
  }

  const rawBoots = readJson(BOOTS_JSON);
  const bootsList = Array.isArray(rawBoots) ? rawBoots : rawBoots?.products ?? [];
  for (const p of bootsList) {
    const gbp = Number(p.priceValue);
    if (gbp > 0) boots.set(String(p.id).replace(/[^a-z0-9]/gi, ""), { gbp, wasGbp: null, brand: p.brand || null });
  }

  return { lf, cb, boots };
}

/**
 * Source price for one listing id, or null when the source isn't known.
 * @param {string} id
 * @param {{ cws?: Map, ek?: Map, madein?: Map, lf?: Map, cb?: Map, boots?: Map }} maps
 */
export function sourcePriceFor(id, maps) {
  let m = id.match(/^kitchen-.+?-cws(\d+)$/);
  if (m) return maps.cws?.get(m[1]) ?? null;
  m = id.match(/^kitchen-.+?-ek-(.+)$/);
  if (m) return maps.ek?.get(m[1]) ?? null;
  m = id.match(/^kitchen-.+?-madein-.*?(\d{8,})$/);
  if (m) return maps.madein?.get(m[1]) ?? null;
  m = id.match(/^cosmetics-.+?-(lf|cb|boots)-(.+)$/);
  if (m) return maps[m[1]]?.get(m[2]) ?? null;
  return null;
}

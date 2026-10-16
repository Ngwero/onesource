/**
 * Import Amazon kitchen listings saved under `/Users/user/kitchen ware`
 * (UK, UK-all, and US jsonl + local images). No network fetches.
 *
 *   cd server && npm run import:amazon-kitchen-folder -- --dry-run
 *   cd server && npm run import:amazon-kitchen-folder
 *
 * Product id: kitchen-{aisleId}-amz{ASIN}
 * Prices: kitchenShelfPrice(), lifted to landed cost × 1.05 when a source
 * price exists. Was-price only when the row itself has a crossed-out price.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { seedRowFromJson } from "../db.js";
import { KITCHEN_WARE_CATEGORY_ID } from "../data/kitchenWareCatalog.js";
import { kitchenShelfPrice, kitchenWasPrice } from "../lib/ugandanKitchenPrices.js";
import { kitchenProductDetails } from "../lib/kitchenProductInfo.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const ROOT = process.env.KITCHEN_WARE_FOLDER?.trim() || "/Users/user/kitchen ware";
const SOURCES = [
  { dir: "Amazon_UK_Kitchen_Ware", market: "uk" },
  { dir: "Amazon_UK_Kitchen_Ware_All", market: "uk" },
  { dir: "Amazon_US_Kitchen_Categories", market: "us" },
];

const dryRun = process.argv.includes("--dry-run");
const replaceExisting = process.argv.includes("--replace");
const aisleArg = flagValue("--aisle");
const limitArg = Number(flagValue("--limit") || 0);
const CONCURRENCY = Math.max(1, Number(flagValue("--concurrency") || 8));
const UPSERT_CHUNK = 80;

const REMOVED = new Set(["small-furniture", "extractor-hoods"]);

function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function cleanTitle(raw) {
  return String(raw ?? "")
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function money(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseRating(text) {
  const m = String(text ?? "").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 && n <= 5 ? Number(n.toFixed(1)) : null;
}

function parseReviews(text) {
  const m = String(text ?? "").replace(/,/g, "").match(/(\d+)/);
  const n = m ? Number(m[1]) : 0;
  return n > 0 ? n : null;
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const rows = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch {
      // A writer may still be appending the last line.
    }
  }
  return rows;
}

function findImage(dir, asin) {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const file = path.join(dir, "images", `${asin}${ext}`);
    if (fs.existsSync(file) && fs.statSync(file).size > 400) return file;
  }
  return null;
}

const BRAND_STOP =
  /^(set|pack|piece|pcs|pk|the|new|with|for|and|of|non|stick|stainless|ceramic|digital|electric|manual|large|small|mini|professional|premium|heavy|duty|kitchen|home|best|extra|multi|colour|color|black|white|red|blue|gold|silver|steel|iron|cast|carbon|enamelled|enameled|glass|wooden|bamboo|silicone|plastic|copper|marble|portable|countertop|universal|replacement|compatible|original|genuine|adjustable|foldable|stackable|expandable|reusable|dishwasher|microwave|induction|nonstick|non-stick)$/i;
const PRODUCT_WORD =
  /^(mugs?|cups?|plates?|bowls?|pans?|pots?|knives|knife|forks?|spoons?|glasses?|kettles?|toasters?|blenders?|racks?|jars?|boards?|scales?|colanders?|whisks?|spatulas?|tongs|dishes?|trays?|tins?|woks?|skillets?|saucepans?|cutlery|flatware|dinnerware|organisers?|organizers?|holders?|dispensers?|bottles?|mills?|graters?|peelers?|scissors|openers?|lids?|mats?|coasters?|napkins?|aprons?|towels?|strainers?|ladles?|scoops?|makers?|machines?|cookers?|fryers?|mixers?|choppers?|sets?)$/i;

function guessBrand(title) {
  const words = cleanTitle(title).split(/\s+/).filter(Boolean);
  if (!words.length || /^(generic|generisch|unbranded|unknown)$/i.test(words[0])) return "";
  const out = [];
  for (const raw of words) {
    const w = raw.replace(/[,:]+$/g, "");
    if (!w || /^\d/.test(w) || BRAND_STOP.test(w) || PRODUCT_WORD.test(w)) break;
    out.push(w);
    if (out.length >= 3) break;
  }
  while (out.length && (out.at(-1) === "&" || BRAND_STOP.test(out.at(-1)))) out.pop();
  const brand = out.join(" ").trim();
  if (brand.length < 2 || brand.length > 40) return "";
  return brand;
}

function cookwareMaterialAisle(title, fallback) {
  if (/emile henry/i.test(title)) return "cookware";
  if (/cast iron|enamel/i.test(title)) return "cast-iron";
  if (/carbon steel|black steel/i.test(title)) return "carbon-steel";
  if (/non-?stick|ceramic|hard anodi[sz]ed|granite|diamond[- ]titanium/i.test(title)) return "non-stick";
  if (/stainless|clad|tri-?ply|\b18\/10\b|copper/i.test(title)) return "stainless-clad";
  if (/\bstaub\b|le creuset|\blodge\b/i.test(title)) return "cast-iron";
  return fallback;
}

function removedAisle(title) {
  const hoodAt = title.search(/range hood|extractor hood|cooker hood|chimney hood|under[- ]cabinet hood/i);
  if (hoodAt >= 0) {
    const before = title.slice(0, hoodAt);
    const accessory =
      /\b(spoons?|forks?|knives|knife|scrubbers?|scour(?:ing|er)?|pads?|sponges?|wool|cloths?|brush(?:es)?|cleaners?|tableware|dinnerware|flatware)\b/i.test(
        before
      );
    const part =
      /\b(filter|cover|protector|accessories|accessory|replacement)\b/i.test(title) &&
      !/under[- ]cabinet|wall[- ]mount|baffle filter|internal motor/i.test(title);
    if (!accessory && !part) return "extractor-hoods";
  }
  if (/wine cool|wine cellar/i.test(title)) return null;
  const furniture =
    /\b(kitchen island|utility cart|prep cart|sideboard|tea cabinet|storage cabinet|wall cabinet|base cabinet)\b/i.test(
      title
    ) || /wall[- ]mounted kitchen cabinet/i.test(title);
  const organizer = /organi[sz]er|shelf|shelves|rack|basket|pull[- ]?out|\bclips?\b|connector/i.test(title);
  if (furniture && !organizer) {
    if (/\b(drying mat|draining board|dish mat|cabinet clips?|wire cube connector)\b/i.test(title)) {
      return null;
    }
    return "small-furniture";
  }
  return null;
}

const APPLIANCE =
  /stand mixer|hand mixer|\bblender\b|food processor|coffee maker|espresso machine|electric kettle|cordless kettle|\btoaster\b|air fryer|deep fryer|slow cooker|multi[- ]?cooker|rice cooker|bread maker|waffle maker|ice cream maker|dehydrator|\bjuicer\b|food chopper|egg cooker|hot plate|electric burner|sandwich maker|\bpanini\b|vacuum sealer|wine cool|wine cellar|nugget ice maker|countertop ice maker|portable ice maker|bullet ice maker|ice making machine/i;
const NOT_APPLIANCE =
  /accessor|replacement|\bpart\b|\bcover\b|\bliner\b|slider|\bmat\b|\bbag\b|\bfilter\b|descaler|\bcleaner\b|\bhose\b|supply line|sensor|thermistor|heater kit|water pump|auger/i;

function isAppliance(title) {
  return APPLIANCE.test(title) && !NOT_APPLIANCE.test(title);
}

/** Map a listing onto a live Kitchen aisle, or a removed aisle to skip. */
export function aisleFor(title, category = "") {
  const removed = removedAisle(title);
  if (removed) return { skip: removed };
  const cat = String(category || "");

  if (
    /\b(kitchen sink|undermount sink|inset sink|belfast sink|faucet|mixer tap|kitchen tap|worktop|laminate worktop)\b/i.test(
      title
    )
  ) {
    return { aisleId: "countertops-sinks" };
  }

  if (cat === "Ice makers" && isAppliance(title) && /ice maker|ice making/i.test(title)) {
    return { aisleId: "small-appliances" };
  }
  if (isAppliance(title) || (cat === "Small appliances" && /\belectric\b/i.test(title))) {
    return { aisleId: "small-appliances" };
  }

  const cookware =
    /\b(frying pan|frypan|skillet|saucepan|sauce pan|stock ?pot|casserole|dutch oven|\bwok\b|saut[eé]|grill pan|cookware set|pan set|pot set|roasting pan|kadai|karahi|tagine|pressure cooker)\b/i.test(
      title
    );
  if (cookware) return { aisleId: cookwareMaterialAisle(title, "cookware") };

  const table =
    /^(Flatware|Cups and mugs|Dinnerware|Coffee and tea)$/.test(cat) ||
    /\b(mug|teacup|tea cup|\bplate\b|\bbowl\b|tumbler|wine glass|cutlery|flatware|dinnerware|\bfork\b|teaspoon|tablespoon|chopstick|saucer|platter|dinner set|\bcup\b)\b/i.test(
      title
    );
  if (table) {
    if (
      /\b(rack|organi[sz]er|holder|caddy)\b/i.test(title) &&
      !/\b(mug|plate|bowl|cup|glass|cutlery set|flatware set|dinnerware)\b/i.test(title)
    ) {
      return { aisleId: "organization" };
    }
    return { aisleId: "tabletop" };
  }

  if (/\b(rack|organi[sz]er|caddy|shelf|basket|spice jar|canister|storage|dish rack|drainer|hook rail)\b/i.test(title)) {
    return { aisleId: "organization" };
  }
  return { aisleId: "cookware-accessories" };
}

function loadListings() {
  const byAsin = new Map();
  const fileRows = {};
  for (const source of SOURCES) {
    const dir = path.join(ROOT, source.dir);
    const rows = readJsonl(path.join(dir, "products.jsonl"));
    fileRows[source.dir] = rows.length;
    for (const row of rows) {
      const asin = String(row.asin || "").trim().toUpperCase();
      if (!asin) continue;
      const title = cleanTitle(row.title);
      const amount = money(row.price);
      const symbol = String(row.price || "");
      const gbp = source.market === "uk" || /£/.test(symbol) ? amount : null;
      const usd = source.market === "us" || (/\$/.test(symbol) && !gbp) ? amount : null;
      const image = findImage(dir, asin) || findImage(dir, row.asin);
      const prev = byAsin.get(asin);
      if (!prev) {
        byAsin.set(asin, {
          asin,
          title,
          category: row.category || "",
          gbp,
          usd,
          wasGbp: money(row.old_price || row.was_price),
          wasUsd: money(row.old_price_usd || row.was_usd),
          rating: parseRating(row.rating),
          reviewCount: parseReviews(row.reviews),
          localPath: image,
          market: source.market,
          sourceDir: source.dir,
        });
        continue;
      }
      if (title && (!prev.title || (source.market === "uk" && gbp))) prev.title = title;
      if (gbp) prev.gbp = gbp;
      if (usd && !prev.gbp) prev.usd = usd;
      if (!prev.localPath && image) prev.localPath = image;
      if (!prev.category && row.category) prev.category = row.category;
      if (!prev.rating && parseRating(row.rating)) prev.rating = parseRating(row.rating);
      if (!prev.reviewCount && parseReviews(row.reviews)) prev.reviewCount = parseReviews(row.reviews);
    }
  }
  return { byAsin, fileRows };
}

function planItems(byAsin) {
  const items = [];
  const skipped = {};
  const note = (reason, example) => {
    const bucket = skipped[reason] || (skipped[reason] = { count: 0, examples: [] });
    bucket.count += 1;
    if (example && bucket.examples.length < 30) bucket.examples.push(example);
  };

  for (const row of byAsin.values()) {
    if (!row.title) {
      note("no-title", row.asin);
      continue;
    }
    if (!row.localPath) {
      note("no-image", `${row.asin} ${row.title.slice(0, 80)}`);
      continue;
    }
    const placed = aisleFor(row.title, row.category);
    if (placed.skip || REMOVED.has(placed.aisleId)) {
      note(placed.skip || placed.aisleId, `${row.asin} ${row.title.slice(0, 120)}`);
      continue;
    }
    if (aisleArg && placed.aisleId !== aisleArg) continue;
    const brand = guessBrand(row.title);
    const item = {
      ...row,
      brand,
      aisleId: placed.aisleId,
      id: `kitchen-${placed.aisleId}-amz${row.asin}`,
    };
    const quote = kitchenShelfPrice({
      id: item.id,
      title: item.title,
      brand: item.brand,
      aisleId: item.aisleId,
      gbp: item.gbp || undefined,
      usd: item.gbp ? undefined : item.usd || undefined,
    });
    item.price = quote.floor && quote.price < quote.floor ? quote.floor : quote.price;
    item.liftedToFloor = Boolean(quote.floor && quote.price < quote.floor);
    item.originalPrice = kitchenWasPrice(item.price, {
      gbp: item.gbp,
      wasGbp: item.wasGbp,
      usd: item.usd,
      wasUsd: item.wasUsd,
    });
    items.push(item);
  }
  return { items, skipped };
}

async function loadExisting(db) {
  const ids = new Set();
  const asins = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("products")
      .select("id")
      .like("id", "kitchen-%-amz%")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data ?? []) {
      ids.add(row.id);
      const m = row.id.match(/-amz([A-Z0-9]+)$/i);
      if (m) asins.add(m[1].toUpperCase());
    }
    if ((data ?? []).length < 1000) break;
  }
  return { ids, asins };
}

async function withRetries(fn, label, attempts = 5) {
  for (let i = 1; ; i += 1) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      const delay = Math.min(8000, 400 * 2 ** (i - 1));
      console.warn(`  retry ${i}/${attempts} ${label}: ${err.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function uploadImage(db, item) {
  const optimized = await sharp(fs.readFileSync(item.localPath))
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const objectPath = `products/kitchen-ware/${item.aisleId}/amz-${item.asin}.webp`;
  await withRetries(async () => {
    const { error } = await db.storage.from(BUCKET).upload(objectPath, optimized, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw error;
  }, `upload ${item.id}`, 8);
  return db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

function productRow(item, image) {
  const h = hashStr(item.id);
  const info = kitchenProductDetails({
    id: item.id,
    title: item.title,
    brand: item.brand || undefined,
    category: item.category || undefined,
    source: item.market === "us" ? "ek" : "cws",
  });
  const details = { ...info.details };
  if (item.rating && item.reviewCount) details.ratingSource = "amazon";
  return seedRowFromJson({
    id: item.id,
    title: `${item.title} – One Source`,
    price: item.price,
    originalPrice: item.originalPrice ?? undefined,
    rating: item.rating ?? Number((4.2 + (h % 7) * 0.1).toFixed(1)),
    reviewCount: item.reviewCount ?? 10 + (h % 180),
    image,
    category: KITCHEN_WARE_CATEGORY_ID,
    unit: /\b(set|piece|pcs)\b/i.test(item.title) ? "set" : "each",
    prime: true,
    description: info.description,
    inStock: true,
    stockQuantity: 6 + (h % 35),
    delivery: "FREE same-day delivery on orders over USh 100,000",
    details,
    published: true,
  });
}

async function backupRows(db, ids) {
  if (!ids.length) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(os.homedir(), "onesource-details", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `kitchen-amazon-overwrite-${stamp}.json`);
  const rows = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await db.from("products").select("*").in("id", chunk);
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  fs.writeFileSync(file, JSON.stringify(rows));
  return file;
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

function summarize(items) {
  const byAisle = {};
  let min = Infinity;
  let max = 0;
  let images = 0;
  let lifted = 0;
  let was = 0;
  for (const item of items) {
    byAisle[item.aisleId] = (byAisle[item.aisleId] || 0) + 1;
    min = Math.min(min, item.price);
    max = Math.max(max, item.price);
    if (item.localPath) images += 1;
    if (item.liftedToFloor) lifted += 1;
    if (item.originalPrice) was += 1;
  }
  return { byAisle, min: items.length ? min : 0, max, images, lifted, was };
}

async function main() {
  console.log(`Folder: ${ROOT}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "import"} | concurrency=${CONCURRENCY}`);
  const { byAsin, fileRows } = loadListings();
  console.log("JSONL rows:", fileRows, `| unique ASINs ${byAsin.size}`);
  const { items: planned, skipped } = planItems(byAsin);
  const summary = summarize(planned);
  console.log(`Importable: ${planned.length}`);
  console.log("Aisles:", summary.byAisle);
  console.log(
    `Price UGX ${summary.min}–${summary.max} | lifted to cost floor ${summary.lifted} | was-price ${summary.was}`
  );
  console.log("Skipped:", Object.fromEntries(Object.entries(skipped).map(([k, v]) => [k, v.count])));

  const db = requireSupabase();
  const existing = await loadExisting(db);
  const fresh = [];
  const updates = [];
  let skippedExisting = 0;
  for (const item of planned) {
    if (existing.asins.has(item.asin) || existing.ids.has(item.id)) {
      if (replaceExisting) updates.push(item);
      else skippedExisting += 1;
    } else fresh.push(item);
  }
  const queue = limitArg > 0 ? [...fresh, ...updates].slice(0, limitArg) : [...fresh, ...updates];
  console.log(`New: ${fresh.length} | replace: ${updates.length} | already listed: ${skippedExisting}`);

  if (dryRun) {
    for (const item of queue.filter((_, i) => i % 400 === 0).slice(0, 12)) {
      console.log(
        `  ${item.aisleId.padEnd(22)} USh ${String(item.price).padStart(8)}  ${item.brand || "—"}  ${item.title.slice(0, 70)}`
      );
    }
    return;
  }

  const backup = await backupRows(
    db,
    updates.map((item) => item.id)
  );
  if (backup) console.log(`Backup: ${backup}`);

  let done = 0;
  let index = 0;
  const errors = [];
  let pending = [];
  async function worker() {
    while (index < queue.length) {
      const item = queue[index++];
      try {
        const image = await uploadImage(db, item);
        pending.push(productRow(item, image));
      } catch (err) {
        errors.push({ id: item.id, message: err.message });
        console.error(`  ✗ ${item.id}: ${err.message}`);
      }
      done += 1;
      if (pending.length >= UPSERT_CHUNK) {
        const chunk = pending;
        pending = [];
        await upsertRows(db, chunk);
      }
      if (done % 200 === 0 || done === queue.length) console.log(`  … ${done}/${queue.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, worker));
  if (pending.length) await upsertRows(db, pending);

  const reportDir = path.join(os.homedir(), "onesource-details", "backups");
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `kitchen-amazon-folder-${stamp}.json`);
  const report = {
    fileRows,
    uniqueAsins: byAsin.size,
    inserted: fresh.length - errors.filter((e) => fresh.some((i) => i.id === e.id)).length,
    updated: updates.length,
    skippedExisting,
    skipped,
    byAisle: summary.byAisle,
    price: { min: summary.min, max: summary.max, liftedToFloor: summary.lifted, wasPrice: summary.was },
    images: summary.images,
    errors: errors.length,
    backup,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log("\nDone.", reportPath);
  console.log(`  imported: ${queue.length - errors.length}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main().catch((err) => {
    console.error("Amazon kitchen folder import failed:", err);
    process.exit(1);
  });
}

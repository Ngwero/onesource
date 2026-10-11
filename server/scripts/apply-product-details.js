#!/usr/bin/env node
/**
 * Writes structured product information (details jsonb), shop descriptions and the
 * published flag for Fresh and Kitchen products.
 *
 *   node scripts/apply-product-details.js --shop fresh|kitchen|all [--dry] [--limit N]
 *
 * Fresh:   unpublished when safety information needs the physical label, when the
 *          listing still uses a placeholder/stock photo, or when the photo failed the
 *          manual image review (data/fresh-image-review.json).
 * Kitchen: manufacturer data from the Cookware Store page cache
 *          (scripts/fetch-cookwarestore-details.js), the Everything Kitchens CSV and
 *          the Made In product feed; title-derived specs otherwise.
 *
 * Before writing, current title/description/details/published are saved to
 * ~/onesource-details/backups/. If the details/published columns are not there yet
 * (server/supabase/product-details.sql not run) only titles and descriptions are
 * written and the rest is saved to ~/onesource-details/pending-<shop>.json — re-run
 * after the migration.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireSupabase } from "../lib/supabase.js";
import { freshProductDetails, freshDescription } from "../lib/freshProductInfo.js";
import { kitchenProductDetails } from "../lib/kitchenProductInfo.js";
import { cosmeticsProductDetails } from "../lib/cosmeticsProductInfo.js";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const arg = (n, d) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : d);
const SHOP = arg("shop", "all");
const DRY = flag("dry");
const LIMIT = Number(arg("limit", "0")) || Infinity;
const HOME = path.join(os.homedir(), "onesource-details");
const CWS_DIR = path.join(HOME, "cws");
const LF_DIR = path.join(HOME, "lf");
const IMAGES = flag("images");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const EK_CSV = path.join(os.homedir(), "everythingkitchens-scraper/products/products.csv");
const CWS_CSV = path.join(os.homedir(), "cookwarestore-scraper/products/products.csv");
const MADEIN_FEED = "https://www.madeincookware.co.uk/collections/shop-all/products.json";

const TITLE_FIXES = [
  [/\bJiuce\b/g, "Juice"],
  [/\bJulice\b/g, "Juice"],
  [/\bPearch\b/g, "Perch"],
  [/\bMnagoes\b/g, "Mangoes"],
  [/\bGradde\b/g, "Grade"],
  [/\bAvacodo\b/g, "Avocado"],
  [/\bFamily Park\b/g, "Family Pack"],
  [/\bChillie\b/g, "Chilli"],
  [/\bWater Melon\b/g, "Watermelon"],
  [/\bNes ?Cafe\b/gi, "Nescafé"],
  [/,\s*$/g, ""],
  [/\s{2,}/g, " "],
];
const fixTitle = (t) => TITLE_FIXES.reduce((s, [re, to]) => s.replace(re, to), t).trim();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER_TEXT = /upload your product photo|listed for ".*" search|replace the placeholder/i;
const STOCK_IMAGE = /images\.unsplash\.com|placehold|placeholder/i;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const stripSuffix = (t) => String(t || "").replace(/\s+–\s+One Source( pick)?\s*$/i, "").trim();

async function fetchAll(db, filter) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from("products").select("*").order("id").range(from, from + 999);
    q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function hasColumns(db) {
  const { error } = await db.from("products").select("details,published").limit(1);
  return !error;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

async function loadMadeIn() {
  const out = [];
  try {
    for (let page = 1; page < 20; page++) {
      const res = await fetch(`${MADEIN_FEED}?limit=250&page=${page}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) break;
      const batch = (await res.json()).products || [];
      if (!batch.length) break;
      out.push(...batch);
    }
  } catch (e) {
    console.warn("Made In feed unavailable:", e.message);
  }
  return out;
}

function planFresh(rows) {
  const review = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/fresh-image-review.json"), "utf8"));
  const badImage = new Set(review.mismatched.map((m) => m.id));
  const placeholderPhoto = new Set((review.placeholderPhoto || []).map((m) => m.id));
  return rows.map((row) => {
    const title = fixTitle(row.title);
    const info = freshProductDetails({ title, unit: row.unit, category: row.category });
    if (UUID_RE.test(row.id)) {
      delete info.details.brand;
      delete info.details.origin;
    }
    const placeholder =
      placeholderPhoto.has(row.id) ||
      PLACEHOLDER_TEXT.test(row.description || "") ||
      STOCK_IMAGE.test(row.image || "") ||
      !row.image;
    const hidden = [];
    if (!info.complete) hidden.push(info.reason);
    if (placeholder) hidden.push("placeholder-photo");
    if (badImage.has(row.id)) hidden.push("photo-mismatch");
    const description = info.complete
      ? freshDescription(title, info.details)
      : PLACEHOLDER_TEXT.test(row.description || "")
        ? `${stripSuffix(title)}.`
        : row.description;
    return {
      id: row.id,
      title,
      description,
      details: { ...info.details, ...(hidden.length ? { hiddenReason: hidden } : {}) },
      published: hidden.length === 0,
    };
  });
}

async function planKitchen(rows) {
  const cwsCsv = fs.existsSync(CWS_CSV) ? parseCsv(fs.readFileSync(CWS_CSV, "utf8")) : [];
  const cwsCat = new Map(cwsCsv.map((r) => [r.product_id, r.category]));
  const ek = fs.existsSync(EK_CSV) ? parseCsv(fs.readFileSync(EK_CSV, "utf8")) : [];
  const ekByName = new Map(ek.map((r) => [norm(r.name), r]));
  const ekBrands = [...new Set(ek.map((r) => r.brand).filter(Boolean))].sort((a, b) => b.length - a.length);
  const madein = rows.some((r) => /-madein-/.test(r.id)) ? await loadMadeIn() : [];

  let cached = 0;
  const plans = rows.map((row) => {
    const source = /-cws\d+$/.test(row.id) ? "cws" : /-ek-/.test(row.id) ? "ek" : /-madein-/.test(row.id) ? "madein" : "ikea";
    const name = stripSuffix(row.title);
    const input = { id: row.id, title: row.title, source };
    if (source === "cws") {
      const pid = row.id.match(/cws(\d+)$/)[1];
      input.category = cwsCat.get(pid);
      const f = path.join(CWS_DIR, `${pid}.json`);
      if (fs.existsSync(f)) {
        input.cws = JSON.parse(fs.readFileSync(f, "utf8"));
        cached++;
      }
    } else if (source === "ek") {
      const hit = ekByName.get(norm(name)) || ekByName.get(norm(name.replace(/\s+–\s+/g, " | ")));
      input.brand = hit?.brand || ekBrands.find((b) => norm(name).startsWith(norm(b)));
      input.category = hit?.category;
    } else if (source === "madein") {
      input.brand = "Made In";
      const p = madein.find((m) => row.id.includes(`madein-${m.handle}`.slice(0, 40)) || norm(m.title) === norm(name.split(" – ")[0]));
      if (p) input.manufacturerDescription = stripHtml(p.body_html);
    } else {
      input.brand = "IKEA";
    }
    const { details, description } = kitchenProductDetails(input);
    const hidden = [];
    if (!row.image || STOCK_IMAGE.test(row.image)) hidden.push("placeholder-photo");
    return {
      id: row.id,
      title: row.title,
      description,
      details: { ...details, ...(hidden.length ? { hiddenReason: hidden } : {}) },
      published: hidden.length === 0,
    };
  });
  console.log(`Kitchen: ${cached} rows with cached Cookware Store manufacturer data`);
  return plans;
}

function planCosmetics(rows) {
  const matchesFile = path.join(LF_DIR, "_matches.json");
  const matches = fs.existsSync(matchesFile) ? JSON.parse(fs.readFileSync(matchesFile, "utf8")) : {};
  let withLf = 0;
  return rows.map((row) => {
    const m = matches[row.id];
    const f = m && path.join(LF_DIR, `${m.lfId}.json`);
    const lf = f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
    if (lf && !lf.gone) withLf++;
    const brand = (row.description || "").match(/Authentic (.+?) (?:[a-z]|from)/)?.[1] || row.details?.brand;
    const info = cosmeticsProductDetails({ title: row.title, brand, lf: lf && !lf.gone ? lf : null });
    const hidden = [];
    if (!info.complete) hidden.push(info.reason);
    if (!row.image || STOCK_IMAGE.test(row.image)) hidden.push("placeholder-photo");
    return {
      id: row.id,
      title: row.title,
      description: info.complete || (lf && !lf.gone) ? info.description : row.description,
      details: { ...info.details, ...(hidden.length ? { hiddenReason: hidden } : {}) },
      published: hidden.length === 0,
      hdImage: lf && !lf.gone && m.exact && lf.image ? lf.image : null,
      aisle: row.id.replace(/^cosmetics-/, "").replace(/-(boots|lf|cb|bap)-.*$/, ""),
    };
  });
}

async function upgradeImages(db, plans, byId) {
  const todo = plans.filter((p) => p.hdImage && !/-hd\.webp$/.test(byId.get(p.id).image || ""));
  console.log(`  ${todo.length} cosmetics images to replace with 1500px manufacturer images`);
  let i = 0;
  let ok = 0;
  const worker = async () => {
    while (i < todo.length) {
      const p = todo[i++];
      try {
        const res = await fetch(p.hdImage, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await sharp(Buffer.from(await res.arrayBuffer()))
          .flatten({ background: "#ffffff" })
          .resize({ width: 1200, height: 1200, fit: "contain", background: "#ffffff" })
          .webp({ quality: 88 })
          .toBuffer();
        const objectPath = `products/cosmetics/${p.aisle}/${p.id.replace(/^cosmetics-[a-z-]+?-(?=(boots|lf|cb|bap)-)/, "")}-hd.webp`;
        const { error } = await db.storage.from(BUCKET).upload(objectPath, buf, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
        if (error) throw error;
        p.image = db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
        ok++;
      } catch (e) {
        console.warn(`  ✗ image ${p.id}: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  console.log(`  replaced ${ok} images`);
}

async function apply(db, shop, rows, plans, columns) {
  fs.mkdirSync(path.join(HOME, "backups"), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (IMAGES && !DRY && shop === "cosmetics") await upgradeImages(db, plans, byId);
  const changed = plans.filter((p) => {
    const r = byId.get(p.id);
    return (
      (p.image && r.image !== p.image) ||
      r.title !== p.title ||
      r.description !== p.description ||
      (columns && (JSON.stringify(r.details ?? {}) !== JSON.stringify(p.details) || (r.published ?? true) !== p.published))
    );
  });
  const hidden = plans.filter((p) => !p.published);
  const reasons = {};
  for (const p of hidden) for (const r of p.details.hiddenReason || []) reasons[r] = (reasons[r] || 0) + 1;
  console.log(`${shop}: ${plans.length} rows, ${changed.length} to update, ${hidden.length} unpublished`, reasons);
  if (DRY) {
    fs.writeFileSync(`/tmp/plan-${shop}.json`, JSON.stringify(plans, null, 1));
    console.log(`  dry run → /tmp/plan-${shop}.json`);
    return;
  }
  const backupFile = path.join(HOME, "backups", `${shop}-${stamp}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify(changed.map((p) => {
      const r = byId.get(p.id);
      return { id: r.id, title: r.title, description: r.description, image: r.image, details: r.details, published: r.published };
    })),
  );
  console.log(`  backup → ${backupFile}`);
  if (!columns) {
    const pending = path.join(HOME, `pending-${shop}.json`);
    fs.writeFileSync(pending, JSON.stringify(plans.map(({ id, details, published }) => ({ id, details, published }))));
    console.log(`  details/published columns missing — saved to ${pending}; run server/supabase/product-details.sql then re-run this script`);
  }
  let done = 0;
  let failed = 0;
  let i = 0;
  const worker = async () => {
    while (i < changed.length) {
      const p = changed[i++];
      const patch = { title: p.title, description: p.description };
      if (p.image) patch.image = p.image;
      if (columns) Object.assign(patch, { details: p.details, published: p.published });
      const { error } = await db.from("products").update(patch).eq("id", p.id);
      if (error) {
        failed++;
        if (failed < 10) console.warn(`  ✗ ${p.id}: ${error.message}`);
      } else done++;
      if ((done + failed) % 1000 === 0) console.log(`  ${done + failed}/${changed.length}`);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`  updated ${done}, failed ${failed}`);
}

async function main() {
  const db = requireSupabase();
  const columns = await hasColumns(db);
  console.log(columns ? "details/published columns present" : "details/published columns NOT present yet");
  if (SHOP === "fresh" || SHOP === "all") {
    const rows = (await fetchAll(db, (q) => q.not("id", "like", "kitchen-%").not("id", "like", "cosmetics-%"))).slice(0, LIMIT);
    await apply(db, "fresh", rows, planFresh(rows), columns);
  }
  if (SHOP === "kitchen" || SHOP === "all") {
    const rows = (await fetchAll(db, (q) => q.like("id", "kitchen-%"))).slice(0, LIMIT);
    await apply(db, "kitchen", rows, await planKitchen(rows), columns);
  }
  if (SHOP === "cosmetics" || SHOP === "all") {
    const rows = (await fetchAll(db, (q) => q.like("id", "cosmetics-%"))).slice(0, LIMIT);
    await apply(db, "cosmetics", rows, planCosmetics(rows), columns);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Replace Pharmacy covers that are smaller than the photo already saved under
 * pharmamarket-products/3-images/. Does not fetch supplier websites.
 *
 *   cd server && node scripts/rehost-pharmacy-local-covers.js
 *
 * Also verifies native cover resolution for pharmacy storefront eligibility.
 * Reuses large hosted covers. Backs up changed rows before writing.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import sharp from "sharp";
import { requireSupabase } from "../lib/supabase.js";
import { isHighQualityPharmacyImage } from "../lib/pharmacyImageQuality.js";
import { pharmacyAisleForCategory } from "../lib/pharmacyClassify.js";

const ROOT = process.env.PHARMA_FOLDER?.trim() || "/Users/user/pharmamarket-products";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
const MIN_GAIN = 80;

function localCovers() {
  const dir = path.join(ROOT, "3-images");
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const name of fs.readdirSync(dir)) {
    const folder = path.join(dir, name);
    if (!fs.statSync(folder).isDirectory()) continue;
    const sku = name.match(/\[([^\]]+)\]$/)?.[1];
    if (!sku) continue;
    const images = fs
      .readdirSync(folder)
      .filter((file) => /\.(jpe?g|png|webp|gif)$/i.test(file))
      .sort()
      .map((file) => path.join(folder, file));
    if (images.length) map.set(sku, images);
  }
  return map;
}

async function aisleBySku(skus) {
  const want = new Set(skus);
  const found = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(ROOT, "products.jsonl")),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim() || found.size === want.size) continue;
    const row = JSON.parse(line);
    const sku = String(row.sku ?? "").trim();
    if (!want.has(sku) || found.has(sku)) continue;
    found.set(sku, pharmacyAisleForCategory(row.category));
  }
  return found;
}

async function dimensionsOf(buf) {
  const { width = 0, height = 0 } = await sharp(buf).metadata();
  return { width, height };
}

async function uploadCover(db, aisleId, sku, buf) {
  const optimized = await sharp(buf)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const objectPath = `products/pharmacy/${aisleId}/pm-${sku}.webp`;
  const { error } = await db.storage.from(BUCKET).upload(objectPath, optimized, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
  const publicUrl = db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
  return `${publicUrl}?v=local`;
}

async function main() {
  const db = requireSupabase();
  const covers = localCovers();
  const aisles = await aisleBySku([...covers.keys()]);
  const backup = [];
  let skipped = 0;
  let missing = 0;
  let updated = 0;
  const examples = [];
  const backupDir = path.join(os.homedir(), "onesource-details", "backups");
  const backupFile = path.join(
    backupDir,
    `pharmacy-image-rehost-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  const flushBackup = () => {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  };

  const jobs = [...covers];
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const [sku, files] = jobs[cursor++];
      const aisleId = aisles.get(sku);
      if (!aisleId) {
        missing += 1;
        continue;
      }
      const id = `pharmacy-${aisleId}-pm-${sku}`;
      const { data, error } = await db.from("products").select("id,image,details").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) {
        missing += 1;
        continue;
      }
      const localBuf = fs.readFileSync(files[0]);
      const localSize = await dimensionsOf(localBuf);
      const localWidth = localSize.width;
      let hostedSize = { width: 0, height: 0 };
      if (typeof data.image === "string" && data.image.includes("/storage/")) {
        try {
          const res = await fetch(data.image, { signal: AbortSignal.timeout(20000) });
          if (res.ok) hostedSize = await dimensionsOf(Buffer.from(await res.arrayBuffer()));
        } catch {
          hostedSize = { width: 0, height: 0 };
        }
      }
      const hostedWidth = hostedSize.width;
      const useLocal = isHighQualityPharmacyImage(localSize) &&
        (!isHighQualityPharmacyImage(hostedSize) || hostedWidth + MIN_GAIN < localWidth);
      const size = useLocal ? localSize : hostedSize;
      if (!isHighQualityPharmacyImage(size)) { skipped += 1; continue; }
      const image = useLocal ? await uploadCover(db, aisleId, sku, localBuf) : data.image;
      const details = data.details && typeof data.details === "object" ? { ...data.details } : {};
      const images = Array.isArray(details.images) ? [...details.images] : [];
      if (images.length) images[0] = image;
      else images.push(image);
      details.images = images;
      details.pharmacyImageQuality = { status: "verified", ...size, image };
      backup.push({ id, image: data.image, details: data.details, hostedWidth, localWidth });
      flushBackup();
      const { error: updateError } = await db.from("products").update({ image, details }).eq("id", id);
      if (updateError) throw updateError;
      updated += 1;
      if (examples.length < 6) examples.push({ id, hostedWidth, localWidth });
      process.stdout.write(`\rupdated ${updated} skipped ${skipped}`);
    }

  }
  await Promise.all(Array.from({ length: 8 }, worker));

  if (backup.length) console.log(`\nbackup ${backupFile}`);
  console.log(JSON.stringify({ localFolders: covers.size, updated, skipped, missing, examples }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

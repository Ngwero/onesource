/** Audit every pharmacy cover and restore supplier originals for thumbnail imports.
 * node server/scripts/audit-pharmacy-images.js [--apply]
 * Resumable results and backups live under ~/onesource-details/backups/.
 * Failed downloads are retried on subsequent runs; low-resolution images stay hidden.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { requireSupabase } from '../lib/supabase.js';
import { isHighQualityPharmacyImage } from '../lib/pharmacyImageQuality.js';

const apply = process.argv.includes('--apply');
const db = requireSupabase();
const dir = path.join(os.homedir(), 'onesource-details', 'backups');
fs.mkdirSync(dir, { recursive: true });
const reportFile = path.join(dir, 'pharmacy-image-audit.jsonl');
const backupFile = path.join(dir, `pharmacy-image-audit-backup-${Date.now()}.jsonl`);
const sourceRows = fs.readFileSync(path.join(process.env.PHARMA_FOLDER || '/Users/user/pharmamarket-products', 'products.jsonl'), 'utf8');
const originals = new Map(sourceRows.split('\n').filter(Boolean).map(line => {
  const row = JSON.parse(line);
  return [String(row.sku), String(row.image || '').replace(/\/cache\/[^/]+/, '')];
}));
const previous = new Map();
if (fs.existsSync(reportFile)) {
  for (const line of fs.readFileSync(reportFile, 'utf8').split('\n').filter(Boolean)) {
    const result = JSON.parse(line);
    if (result.status !== 'error') previous.set(result.id, result);
  }
}
const summary = { scanned: 0, verified: 0, lowResolution: 0, failed: 0, updated: 0, reused: 0, upgraded: 0 };
const started = Date.now();
let lastLog = started;
async function databaseRequest(operation) {
  for (let attempt = 0; ; attempt++) {
    const result = await operation();
    if (!result.error) return result;
    if (attempt >= 4) throw result.error;
    await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
  }
}

async function dimensions(image) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(image, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        await response.body?.cancel();
        const error = new Error(`HTTP ${response.status}`);
        error.permanent = [401, 403, 404].includes(response.status);
        throw error;
      }
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          chunks.push(value);
          size += value.length;
          try {
            const { width = 0, height = 0 } = await sharp(Buffer.concat(chunks)).metadata();
            if (width && height) return { width, height };
          } catch { /* JPEG/PNG headers may span multiple network chunks. */ }
          if (size > 2 * 1024 * 1024) throw new Error('Image header exceeds 2 MB');
        }
        throw new Error('Missing image dimensions');
      } finally { await reader.cancel(); }
    } catch (error) {
      if (error.permanent) throw error;
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw lastError;
}
async function audit(row) {
  let result = previous.get(row.id);
  if (!result || (result.image !== row.image && result.originalImage !== row.image)) {
    try {
      // Check the full-size supplier file directly for unverified imports, avoiding
      // another request for a thumbnail that would be replaced anyway.
      const original = originals.get(row.id.split('-pm-')[1]);
      const candidate = row.details?.pharmacyImageQuality?.status === 'verified'
        ? row.image : original || row.image;
      const size = await dimensions(candidate);
      result = { id: row.id, image: row.image, ...size,
        ...(candidate !== row.image ? { originalImage: candidate, originalChecked: true } : {}),
        status: isHighQualityPharmacyImage(size) ? 'verified' : 'low-resolution' };
    } catch (error) {
      result = { id: row.id, image: row.image, status: 'error', originalChecked: true, error: error.message };
    }

  } else summary.reused++;
  if (result.status !== 'verified' && !result.originalChecked) {
    const originalImage = originals.get(row.id.split('-pm-')[1]);
    if (originalImage && originalImage !== row.image) {
      try {
        const size = await dimensions(originalImage);
        result = { ...result, ...size, originalImage, originalChecked: true,
          status: isHighQualityPharmacyImage(size) ? 'verified' : 'low-resolution' };
        delete result.error;
      } catch (error) {
        result = { ...result, status: 'error', error: `Original: ${error.message}` };
      }
    }
  }
  fs.appendFileSync(reportFile, JSON.stringify(result) + '\n');
  const nextImage = result.status === 'verified' ? result.originalImage || row.image : row.image;
  if (nextImage !== row.image) summary.upgraded++;

  if (apply && result.status !== 'error' &&
      (result.status === 'verified' || row.details?.pharmacyImageQuality?.status === 'verified') &&
      (row.details?.pharmacyImageQuality?.status !== result.status || nextImage !== row.image)) {
    // Preserve all product information and save it before changing the quality marker.
    fs.appendFileSync(backupFile, JSON.stringify({ id: row.id, image: row.image, details: row.details }) + '\n');
    const { id, ...quality } = result;
    quality.image = nextImage;
    const details = { ...row.details, pharmacyImageQuality: quality };
    if (nextImage !== row.image) details.images = [nextImage, ...(details.images || []).filter(url => url !== row.image && url !== nextImage)];
    const { error } = await databaseRequest(() => db.from('products').update({ image: nextImage, details }).eq('id', row.id).eq('image', row.image));
    if (error) throw error;
    summary.updated++;
  }
  summary.scanned++;
  if (result.status === 'verified') summary.verified++;
  else if (result.status === 'low-resolution') summary.lowResolution++;
  else summary.failed++;
  if (Date.now() - lastLog > 10000) {
    lastLog = Date.now();
    console.log(JSON.stringify({ ...summary, seconds: Math.round((Date.now() - started) / 1000) }));
  }
}
let after = 'pharmacy-';
for (;;) {
  const { data, error } = await databaseRequest(() => db.from('products').select('id,image,details').gt('id', after).lt('id', 'pharmacy.').order('id').limit(1000));
  if (error) throw error;
  if (!data.length) break;
  let cursor = 0;
  await Promise.all(Array.from({ length: 24 }, async () => {
    while (cursor < data.length) await audit(data[cursor++]);
  }));
  after = data.at(-1).id;
}
console.log(JSON.stringify({ ...summary, apply, reportFile, backupFile, seconds: Math.round((Date.now() - started) / 1000) }, null, 2));
if (summary.failed) process.exitCode = 1;

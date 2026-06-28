import sharp from "sharp";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { requireSupabase } from "./supabase.js";
import { isSupabaseConfigured, useSupabaseStorage } from "./env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

const MAX_WIDTH = 1400;
const MAX_HEIGHT = 1400;
const WEBP_QUALITY = 82;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/tiff",
]);

export function isAllowedImageMime(mime) {
  return ALLOWED_MIME.has(mime);
}

/** Resize and convert any supported image to WebP. */
export async function convertToWebp(buffer) {
  return sharp(buffer)
    .rotate()
    .resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function saveLocalWebp(webpBuffer, folder) {
  const dir = path.join(UPLOADS_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  await fs.writeFile(path.join(dir, filename), webpBuffer);
  return { storage: "local", path: `${folder}/${filename}` };
}

async function saveSupabaseWebp(webpBuffer, folder) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
  const db = requireSupabase();
  const objectPath = `${folder}/${randomUUID()}.webp`;

  const { error } = await db.storage.from(bucket).upload(objectPath, webpBuffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw error;

  const { data } = db.storage.from(bucket).getPublicUrl(objectPath);
  return { storage: "supabase", url: data.publicUrl, path: objectPath };
}

/**
 * @param {import('express').Request} req
 * @param {Buffer} fileBuffer
 * @param {{ folder?: string, mime?: string }} options
 */
/** Relative path works on admin (:3001) and shop (:5173 via Vite /uploads proxy). */
function localPublicPath(relativePath) {
  return `/uploads/${relativePath}`;
}

export async function processAndStoreImage(req, fileBuffer, options = {}) {
  const { folder = "products", mime } = options;

  if (mime && !isAllowedImageMime(mime)) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }

  const webpBuffer = await convertToWebp(fileBuffer);
  const log = (msg) => console.log(`[upload] ${msg}`);

  if (!useSupabaseStorage()) {
    const local = await saveLocalWebp(webpBuffer, folder);
    const url = localPublicPath(local.path);
    log(`local ${folder} → ${url} (${webpBuffer.length} bytes webp)`);
    return {
      url,
      storage: "local",
      format: "webp",
      size: webpBuffer.length,
    };
  }

  try {
    const result = await saveSupabaseWebp(webpBuffer, folder);
    log(`supabase ${folder} → ${result.url} (${webpBuffer.length} bytes webp)`);
    return {
      url: result.url,
      storage: result.storage,
      format: "webp",
      size: webpBuffer.length,
    };
  } catch (storageErr) {
    console.error(`[upload] supabase failed (${storageErr.message})`);
    throw new Error(
      `Cloud upload failed: ${storageErr.message}. Fix Supabase Storage (bucket "images") — images are not saved locally in production mode.`
    );
  }
}

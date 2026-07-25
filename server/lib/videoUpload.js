import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { requireSupabase } from "./supabase.js";
import { useSupabaseStorage } from "./env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

const ALLOWED_VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const EXT_BY_MIME = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function isAllowedVideoMime(mime) {
  return ALLOWED_VIDEO_MIME.has(mime);
}

function localPublicPath(relativePath) {
  return `/uploads/${relativePath}`;
}

async function saveLocalVideo(buffer, folder, ext) {
  const dir = path.join(UPLOADS_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return { storage: "local", path: `${folder}/${filename}` };
}

async function saveSupabaseVideo(buffer, folder, ext, mime) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";
  const db = requireSupabase();
  const objectPath = `${folder}/${randomUUID()}.${ext}`;

  const { error } = await db.storage.from(bucket).upload(objectPath, buffer, {
    contentType: mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;

  const { data } = db.storage.from(bucket).getPublicUrl(objectPath);
  return { storage: "supabase", url: data.publicUrl, path: objectPath };
}

/**
 * Store an MP4/WebM for kitchen hero autoplay (phones need native video, not YouTube).
 * @param {Buffer} fileBuffer
 * @param {{ folder?: string, mime?: string }} options
 */
export async function processAndStoreVideo(fileBuffer, options = {}) {
  const { folder = "kitchen", mime = "video/mp4" } = options;
  if (!isAllowedVideoMime(mime)) {
    throw new Error("Unsupported video type. Use MP4 or WebM.");
  }
  const ext = EXT_BY_MIME[mime] || "mp4";
  const log = (msg) => console.log(`[upload:video] ${msg}`);

  if (!useSupabaseStorage()) {
    const local = await saveLocalVideo(fileBuffer, folder, ext);
    const url = localPublicPath(local.path);
    log(`local ${folder} → ${url} (${fileBuffer.length} bytes)`);
    return {
      url,
      storage: "local",
      format: ext,
      size: fileBuffer.length,
    };
  }

  try {
    const result = await saveSupabaseVideo(fileBuffer, folder, ext, mime);
    log(`supabase ${folder} → ${result.url} (${fileBuffer.length} bytes)`);
    return {
      url: result.url,
      storage: result.storage,
      format: ext,
      size: fileBuffer.length,
    };
  } catch (storageErr) {
    console.error(`[upload:video] supabase failed (${storageErr.message})`);
    throw new Error(
      `Cloud video upload failed: ${storageErr.message}. Fix Supabase Storage bucket "images".`
    );
  }
}

import { convertToWebp } from "./imageUpload.js";
import { requireSupabase } from "./supabase.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";

/**
 * Download a remote image, store as WebP in Supabase Storage, return public URL.
 * Uses upsert so re-seeding is safe.
 */
export async function seedImageToSupabase(sourceUrl, objectPath) {
  const db = requireSupabase();
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: HTTP ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const webp = await convertToWebp(buffer);

  const { error } = await db.storage.from(BUCKET).upload(objectPath, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;

  const { data } = db.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

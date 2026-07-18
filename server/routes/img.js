/**
 * On-the-fly image resize + disk cache.
 * Serves card-sized WebPs with long Cache-Control so product grids load faster.
 *
 *   GET /api/img?src=<url-or-/uploads/path>&w=400&q=72
 */
import { Router } from "express";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { env, isSupabaseConfigured } from "../lib/env.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, "..", "uploads", "img-cache");
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "images";

const ALLOWED_HOSTS = new Set();
if (env.supabaseUrl) {
  try {
    ALLOWED_HOSTS.add(new URL(env.supabaseUrl).host);
  } catch {
    /* ignore */
  }
}
ALLOWED_HOSTS.add("images.unsplash.com");

const WIDTH_PRESETS = new Set([160, 240, 320, 400, 480, 640, 800, 1000, 1200, 1600]);

function clampWidth(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 400;
  const rounded = Math.round(n);
  if (WIDTH_PRESETS.has(rounded)) return rounded;
  // nearest preset
  return [...WIDTH_PRESETS].reduce((best, w) =>
    Math.abs(w - rounded) < Math.abs(best - rounded) ? w : best
  );
}

function clampQuality(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 72;
  return Math.min(85, Math.max(50, Math.round(n)));
}

function resolveSource(src) {
  if (!src?.trim()) return null;
  const trimmed = src.trim();

  if (trimmed.startsWith("/uploads/")) {
    const rel = trimmed.slice("/uploads/".length);
    const localPath = path.join(UPLOADS_ROOT, rel);
    return { kind: "local", localPath, rel, key: trimmed };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    if (!ALLOWED_HOSTS.has(url.host)) return null;
    return { kind: "remote", url: url.toString(), key: url.toString() };
  }

  // Bare storage object path: products/foo.webp
  if (isSupabaseConfigured() && !trimmed.includes("://") && !trimmed.startsWith("/")) {
    const base = env.supabaseUrl.replace(/\/$/, "");
    const url = `${base}/storage/v1/object/public/${BUCKET}/${trimmed.replace(/^\//, "")}`;
    return { kind: "remote", url, key: url };
  }

  return null;
}

async function loadSourceBuffer(source) {
  if (source.kind === "local") {
    try {
      return await fs.readFile(source.localPath);
    } catch {
      // Fall through to Supabase public URL for the same relative path
      if (isSupabaseConfigured() && source.rel) {
        const base = env.supabaseUrl.replace(/\/$/, "");
        const url = `${base}/storage/v1/object/public/${BUCKET}/${source.rel}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Upstream ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
      }
      throw new Error("Local image missing");
    }
  }

  const res = await fetch(source.url);
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

router.get("/", async (req, res) => {
  try {
    const source = resolveSource(String(req.query.src || ""));
    if (!source) {
      return res.status(400).json({ error: "Invalid or disallowed image src" });
    }

    const width = clampWidth(req.query.w);
    const quality = clampQuality(req.query.q);
    const cacheKey = crypto
      .createHash("sha1")
      .update(`${source.key}|${width}|${quality}`)
      .digest("hex");
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.webp`);

    try {
      await fs.access(cachePath);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("X-Image-Cache", "HIT");
      return res.sendFile(cachePath);
    } catch {
      /* miss */
    }

    const input = await loadSourceBuffer(source);
    const output = await sharp(input)
      .rotate()
      .resize({
        width,
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality })
      .toBuffer();

    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, output);

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("X-Image-Cache", "MISS");
    res.send(output);
  } catch (e) {
    res.status(502).json({ error: e.message || "Image resize failed" });
  }
});

export default router;

export type ImageSizeOptions = {
  /** Target display width in CSS pixels. */
  width?: number;
  /** WebP quality 50–85. Used only when Supabase image transforms are enabled. */
  quality?: number;
};

/**
 * Supabase image transformations (Storage → Image Transformations, Pro).
 * A probe of `/storage/v1/render/image/...` on this project returned 200, so
 * resized renditions are on unless `VITE_SUPABASE_IMAGE_TRANSFORMS=false`.
 * Set that to false to serve public Storage URLs as-is (Cloudflare CDN).
 * Do not route those through `/api/img`: that proxy re-downloads and re-encodes
 * on Railway and is several times slower than the CDN, even on a cache hit.
 */
const IMAGE_TRANSFORMS =
  import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORMS !== "false";

const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

function supabaseOrigin(): string {
  return (import.meta.env.VITE_SUPABASE_URL?.trim() || "").replace(/\/$/, "");
}

function storageBucket(): string {
  return import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || "images";
}

function stripUrlDecorations(url: string): string {
  return url.split("#")[0].split("?")[0];
}

function isSupabaseHost(url: string): boolean {
  if (url.includes(".supabase.co")) return true;
  const origin = supabaseOrigin();
  return Boolean(origin && url.startsWith(origin));
}

/**
 * Public Storage object URL, or null when this src is not on Supabase.
 * Also unwraps an existing render URL so callers can request a new width.
 */
export function toPublicObjectUrl(url: string): string | null {
  const clean = stripUrlDecorations(url);

  if (isSupabaseHost(clean) && clean.includes(OBJECT_PUBLIC)) {
    return clean;
  }

  if (isSupabaseHost(clean) && clean.includes(RENDER_PUBLIC)) {
    const idx = clean.indexOf(RENDER_PUBLIC);
    const origin = clean.slice(0, idx);
    const objectPath = clean.slice(idx + RENDER_PUBLIC.length);
    return `${origin}${OBJECT_PUBLIC}${objectPath}`;
  }

  const origin = supabaseOrigin();
  if (origin && url.startsWith("/uploads/")) {
    const objectPath = url.slice("/uploads/".length);
    return `${origin}${OBJECT_PUBLIC}${storageBucket()}/${objectPath}`;
  }

  return null;
}

function clampQuality(raw: number | undefined, fallback: number): number {
  if (raw == null || !Number.isFinite(raw)) return fallback;
  return Math.min(85, Math.max(50, Math.round(raw)));
}

/**
 * Supabase render endpoint. Only call when image transformations are enabled;
 * otherwise the URL 403s.
 */
export function supabaseTransformUrl(
  publicObjectUrl: string,
  width: number,
  quality = 70
): string | null {
  const idx = publicObjectUrl.indexOf(OBJECT_PUBLIC);
  if (idx < 0) return null;
  const origin = publicObjectUrl.slice(0, idx);
  const objectPath = publicObjectUrl.slice(idx + OBJECT_PUBLIC.length);
  const params = new URLSearchParams({
    width: String(Math.round(width)),
    quality: String(clampQuality(quality, 70)),
    resize: "contain",
  });
  return `${origin}/storage/v1/render/image/public/${objectPath}?${params.toString()}`;
}

/**
 * Normalize product/category image paths for img src.
 * Listing cards request a 400px transform. Width is a max: Supabase does not
 * enlarge, so 146×184 pharmacy covers stay 146×184.
 */
export function resolveImageUrl(
  src: string | undefined,
  options?: ImageSizeOptions
): string {
  if (!src?.trim()) return "";
  const url = src.trim();

  if (url.startsWith("data:")) return url;

  const width = options?.width;
  const wantResize = width != null && Number.isFinite(width) && width > 0;
  const publicUrl = toPublicObjectUrl(url);

  if (publicUrl) {
    if (wantResize && IMAGE_TRANSFORMS) {
      return supabaseTransformUrl(publicUrl, width, clampQuality(options?.quality, 70)) ?? publicUrl;
    }
    return publicUrl;
  }

  if (wantResize && url.startsWith("/") && !url.startsWith("//")) {
    const params = new URLSearchParams({
      src: url,
      w: String(Math.round(width)),
    });
    if (options?.quality != null) {
      params.set("q", String(clampQuality(options.quality, 72)));
    }
    return `/api/img?${params.toString()}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }

  return url;
}

/** srcSet only when each width is a distinct URL (transforms on). Identical CDN originals are omitted. */
export function imageSrcSet(
  src: string | undefined,
  widths: { width: number; quality?: number }[]
): string | undefined {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const entry of widths) {
    const url = resolveImageUrl(src, entry);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    parts.push(`${url} ${entry.width}w`);
  }
  return parts.length > 1 ? parts.join(", ") : undefined;
}

/** Width presets used by ProductImage / cards. */
export const IMAGE_WIDTH = {
  basket: 160,
  thumb: 240,
  card: 400,
  card2x: 800,
  category: 320,
  detail: 1000,
  hero: 1200,
  hero2x: 1600,
} as const;

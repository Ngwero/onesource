export type ImageSizeOptions = {
  /** Target display width in CSS pixels. */
  width?: number;
  /** WebP quality 50–85. Used only when Supabase image transforms are enabled. */
  quality?: number;
};

/**
 * Supabase image transformations are a paid Storage feature. A live probe of
 * `/storage/v1/render/image/...` returned 403 FeatureNotEnabled, so this stays
 * off until the dashboard toggle is on AND this env var is set at build time.
 * While it is off, public Storage URLs are used as-is (Cloudflare CDN).
 * Do not route those through `/api/img`: that proxy re-downloads and re-encodes
 * on Railway and is several times slower than the CDN, even on a cache hit.
 */
const IMAGE_TRANSFORMS =
  import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORMS === "true";

const OBJECT_PUBLIC = "/storage/v1/object/public/";

function supabaseOrigin(): string {
  return (import.meta.env.VITE_SUPABASE_URL?.trim() || "").replace(/\/$/, "");
}

function storageBucket(): string {
  return import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || "images";
}

/** Public Storage object URL, or null when this src is not on Supabase. */
function toPublicObjectUrl(url: string): string | null {
  if (url.includes(".supabase.co") && url.includes(OBJECT_PUBLIC)) {
    return url.split("#")[0].split("?")[0];
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
 * Card widths request a ~400px transform only when that feature is enabled.
 * Otherwise Supabase public URLs are returned unchanged so the browser hits the CDN.
 * `/api/img` remains for local `/uploads/` files that are not on Storage.
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

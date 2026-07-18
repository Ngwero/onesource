export type ImageSizeOptions = {
  /** Target display width in CSS pixels (served via /api/img resize cache). */
  width?: number;
  /** WebP quality 50–85 (default 72 on the server). */
  quality?: number;
};

/**
 * Normalize product/category image paths for img src.
 * Pass `width` to route through the server resize cache for faster card/hero loads.
 */
export function resolveImageUrl(
  src: string | undefined,
  options?: ImageSizeOptions
): string {
  if (!src?.trim()) return "";
  const url = src.trim();

  if (url.startsWith("data:")) return url;

  if (options?.width && Number.isFinite(options.width) && options.width > 0) {
    const params = new URLSearchParams({
      src: url,
      w: String(Math.round(options.width)),
    });
    if (options.quality != null) {
      params.set("q", String(options.quality));
    }
    return `/api/img?${params.toString()}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Production: /uploads/* files are served from Supabase Storage.
  if (url.startsWith("/uploads/") && import.meta.env.PROD) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
    const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || "images";
    if (supabaseUrl) {
      const objectPath = url.slice("/uploads/".length);
      return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
    }
  }

  if (url.startsWith("/")) {
    return url;
  }

  return url;
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

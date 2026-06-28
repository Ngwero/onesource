/** Normalize product/category image paths for img src. */
export function resolveImageUrl(src: string | undefined): string {
  if (!src?.trim()) return "";
  const url = src.trim();

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

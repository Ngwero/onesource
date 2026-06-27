/** Normalize product/category image paths for img src (supports /uploads proxy on Vite). */
export function resolveImageUrl(src: string | undefined): string {
  if (!src?.trim()) return "";
  const url = src.trim();
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }
  return url;
}

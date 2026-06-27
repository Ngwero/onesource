/** True when the product has a real image from admin (upload or URL), not a seed placeholder. */
export function hasAdminProductImage(image: string | undefined | null): boolean {
  const img = (image ?? "").trim();
  if (!img) return false;
  if (/placeholders\//i.test(img)) return false;
  if (img.startsWith("http://") || img.startsWith("https://")) return true;
  if (img.startsWith("/uploads/")) return true;
  return false;
}

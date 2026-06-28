/**
 * Inline SVG data-URI used as a fallback when an external image fails to load.
 * Rendered as a neutral grey tile so the layout never breaks.
 */
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='640' viewBox='0 0 480 640'%3E%3Crect width='480' height='640' fill='%23faf9f6'/%3E%3Crect x='24' y='24' width='432' height='592' rx='16' fill='%23ffffff' stroke='%23e3e1da' stroke-width='2'/%3E%3Ctext x='240' y='300' text-anchor='middle' font-family='system-ui%2Csans-serif' font-size='14' font-weight='700' fill='%232e5e4a' letter-spacing='2'%3EONE SOURCE%3C/text%3E%3Ctext x='240' y='330' text-anchor='middle' font-family='system-ui%2Csans-serif' font-size='12' fill='%239a9a96'%3EImage unavailable%3C/text%3E%3C/svg%3E";

/** Normalize product/category image paths for img src (supports /uploads proxy on Vite). */
export function resolveImageUrl(src: string | undefined): string {
  if (!src?.trim()) return PLACEHOLDER_IMAGE;
  const url = src.trim();
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/") || url.startsWith("data:")) {
    return url;
  }
  return url;
}

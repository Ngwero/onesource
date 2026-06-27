import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLines(text, maxLen = 22) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxLen && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * Create a local WebP placeholder if missing. Returns public URL path /uploads/...
 */
export async function ensureProductPlaceholder(productId, productTitle) {
  const relative = `products/placeholders/${productId}.webp`;
  const full = path.join(UPLOADS_ROOT, relative);

  try {
    await fs.access(full);
    return `/uploads/${relative}`;
  } catch {
    /* create */
  }

  await fs.mkdir(path.dirname(full), { recursive: true });

  const lines = wrapLines(productTitle);
  const lineEls = lines
    .map(
      (ln, i) =>
        `<text x="240" y="${280 + i * 28}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="600" fill="#1c1c1c">${escapeXml(ln)}</text>`
    )
    .join("");

  const svg = `<svg width="480" height="640" xmlns="http://www.w3.org/2000/svg">
  <rect width="480" height="640" fill="#faf9f6"/>
  <rect x="24" y="24" width="432" height="592" rx="16" fill="#ffffff" stroke="#e3e1da" stroke-width="2"/>
  <text x="240" y="200" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#2e5e4a" letter-spacing="2">ONE SOURCE</text>
  ${lineEls}
  <text x="240" y="420" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#5c5c58">Replace image in admin</text>
  <text x="240" y="448" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#9a9a96">/uploads/products/placeholders/${escapeXml(productId)}.webp</text>
</svg>`;

  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(full);
  return `/uploads/${relative}`;
}

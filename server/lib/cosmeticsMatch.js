/**
 * Strict title matching between our cosmetics listings and Lookfantastic product URLs
 * (sitemap slugs). Brand, product-name tokens and pack size must all agree.
 */

const STOP = new Set(["the", "and", "with", "for", "de", "of", "a", "in", "by", "to", "one", "source", "various", "shades", "shade", "size", "full"]);

export const normText = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[™®©’']/g, "")
    .replace(/–.*one source.*$/i, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function sizeOf(s) {
  const m = normText(s).match(/\b(\d+(?:\.\d+)?)\s?(ml|g|kg|l|oz|capsules|pcs|pieces)\b/);
  return m ? `${Number(m[1])}${m[2]}` : null;
}

const SPELLING = (t) =>
  t
    .replace(/iz(e|es|ed|er|ers|ing)$/, "is$1")
    .replace(/^color/, "colour")
    .replace(/^defense$/, "defence")
    .replace(/^creme$/, "cream")
    .replace(/^eyebrow$/, "brow");

export const GENERIC_TOKENS = new Set(["mini", "travel", "jumbo", "refill", "deluxe", "formula", "collection", "edition", "limited", "supersize", "value"]);

const DISTINCT_TOKENS = new Set(["eye", "eyes", "night", "day", "men", "homme", "man", "baby", "kids", "tinted", "body", "face", "hand", "lip", "lips", "hair", "foot", "intense", "extreme", "rich", "light", "oil", "gel", "cream", "lotion", "serum", "mask", "balm", "spray", "stick", "powder", "liquid", "waterproof", "matte", "sheer"]);

export const tokens = (s) =>
  normText(s)
    .replace(/\b\d+(?:\.\d+)?\s?(ml|g|kg|l|oz)\b/g, " ")
    .split(" ")
    .filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t))
    .map(SPELLING);

const BRAND_ALIASES = {
  "christian dior": "dior",
  "estee lauder": "estee lauder",
  "m.a.c": "mac",
  "m a c": "mac",
  bareminerals: "bareminerals",
  "make up for ever": "make up for ever",
};

export function brandKey(b) {
  const n = normText(b).replace(/\./g, " ").replace(/\s+/g, " ").trim();
  return BRAND_ALIASES[n] || n;
}

export function lfIndex(urls) {
  return urls
    .map((u) => {
      const m = u.match(/\/p\/([^/]+)\/(\d+)\/?$/);
      if (!m) return null;
      const name = m[1].replace(/-/g, " ");
      return { url: u, id: m[2], name, tokens: new Set(tokens(name)), size: sizeOf(name) };
    })
    .filter(Boolean);
}

/** Returns best Lookfantastic candidate or null. */
export function matchLf(title, brand, index) {
  const tt = tokens(title);
  if (tt.length < 2) return null;
  const size = sizeOf(title);
  const bk = brandKey(brand || "");
  const brandTokens = bk ? bk.split(" ") : [];
  let best = null;
  for (const c of index) {
    if (brandTokens.length && !brandTokens.every((t) => c.tokens.has(t) || c.name.startsWith(bk))) continue;
    if (size && c.size && size !== c.size) continue;
    let inter = 0;
    for (const t of tt) if (c.tokens.has(t)) inter++;
    const recall = inter / tt.length;
    const precision = inter / c.tokens.size;
    const score = (2 * recall * precision) / (recall + precision || 1);
    if (!best || score > best.score) best = { ...c, score, recall, precision };
  }
  if (!best || best.precision < 0.6) return null;
  const missing = tt.filter((t) => !best.tokens.has(t));
  if (missing.length && !missing.every((t) => GENERIC_TOKENS.has(t))) return null;
  const ours = new Set(tt);
  const extra = [...best.tokens].filter((t) => !ours.has(t));
  if (extra.some((t) => DISTINCT_TOKENS.has(t) || /^spf/.test(t))) return null;
  const exact = missing.length === 0 && !/various (shades|sizes)/.test(best.name) && (!size || size === best.size);
  return { ...best, missing, exact };
}

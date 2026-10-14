/**
 * UK beauty sticker (GBP) → competitive Kampala shelf price (UGX).
 *
 * Benchmarks (Oct 2026, data/uganda-price-benchmarks.json): the same brands sell
 * in Kampala at about UK ex-VAT price × FX × 1.0–1.15 — MAC lipstick UGX 70–125k
 * (Beauty Glow / Beauty Trends), Estée Lauder Double Wear US$47–58 and ANR 50ml
 * US$107 (SweetCare UG), Dior Sauvage EDP 100ml UGX 570–700k, Olaplex No.4 and
 * Kérastase 250ml ≈ UGX 102–106k (SweetCare UG), Maybelline mascara UGX 51–70k.
 * Jumia listings far below UK cost are treated as grey market and not matched.
 *
 * Price = UK price without the 20% VAT × FX × margin. The margin tapers from
 * 1.12 on cheap items (handling is a bigger share) to 1.06 on luxury items, so
 * premium brands land at Kampala premium-retail level instead of UK × markup.
 * Never below landed cost × COSMETICS_FLOOR_MARGIN, even when a category ceiling
 * says lower (those are reported by scripts/reprice-market-uganda.js).
 */
export const COSMETICS_UGX_PER_GBP = 4750;
export const UK_VAT = 1.2;
export const COSMETICS_MARGIN_LOW = 1.12;
export const COSMETICS_MARGIN_HIGH = 1.06;
export const COSMETICS_FLOOR_MARGIN = 1.05;

const PREMIUM_COSMETICS_BRANDS =
  /\b(dior|chanel|est[eé]e lauder|clinique|lanc[oô]me|ysl|yves saint laurent|tom ford|guerlain|givenchy|armani|la mer|sisley|cl[eé] de peau|111skin|natura biss[eé]|augustinus bader|charlotte tilbury|nars|m[·.]?a[·.]?c\b|bobbi brown|k[eé]rastase|shiseido|elemis|dr\.? barbara sturm|sunday riley|drunk elephant|hourglass|pat mcgrath|creed|jo malone|byredo|le labo|maison margiela|prada|valentino|gucci|burberry|carolina herrera|versace|dolce|mugler|viktor|kilian|diptyque|dyson|foreo|nuface|ghd|baobab collection|by terry|sk-?ii|la prairie|omorovicza|tatcha|la roche-posay luxe|hugo boss|paco rabanne|rabanne|jimmy choo|marc jacobs|chlo[eé]|narciso|issey miyake|thierry|benefit|too faced|urban decay|fenty|rare beauty|huda|anastasia|laura mercier|clarins|decl[eé]or|caudal[ií]e|medik8|skinceuticals|zo skin|mz skin|d[eé]esse|lyma|currentbody)\b/i;
const BUDGET_COSMETICS_BRANDS =
  /\b(nivea|dove|vaseline|garnier|l'or[eé]al paris|maybelline|rimmel|nyx|e\.?l\.?f|revolution|essence|catrice|cerave|cetaphil|the ordinary|simple|neutrogena|palmer'?s|bulldog|batiste|sanctuary|soap (&|and) glory|bondi sands|real techniques|w7|barry m|sleek|collection|boots|superdrug|elvive|tresemm[eé]|pantene|aussie|head (&|and) shoulders|herbal essences|ogx|shea moisture|cantu|inc\.?redible|bioré|biore|carmex|nair|veet|sure|lynx|imperial leather|radox|original source|carex|johnson'?s|e45|aveeno|eucerin|qv|cien|beauty works lite|the inkey list|revolution skincare|byoma|i heart revolution|makeup revolution|technic|mua)\b/i;

/** "premium" | "mid" | "budget" from the brand, or the title's first words when the brand is unknown. */
export function cosmeticsBrandTier(brand = "", title = "") {
  const text = String(brand || "").trim() || String(title || "").split(/\s+/).slice(0, 3).join(" ");
  if (PREMIUM_COSMETICS_BRANDS.test(text)) return "premium";
  if (BUDGET_COSMETICS_BRANDS.test(text)) return "budget";
  return "mid";
}

/** Reference categories from the benchmark file, detected from the title. */
const CATEGORY_RULES = [
  ["perfume-100ml", /eau de (parfum|toilette)|\bedp\b|\bedt\b|parfum\b|cologne/i],
  ["lipstick", /lipstick|lip colou?r\b|lip stick/i],
  ["foundation", /foundation/i],
  ["mascara", /mascara/i],
  ["sunscreen", /\bspf\b|sunscreen|sun cream|sun lotion|suncare/i],
  ["shampoo", /shampoo/i],
  ["body-lotion", /body (lotion|milk|moisturi[sz]er|cream)/i],
  ["nail-polish", /nail (polish|colou?r|lacquer|varnish)/i],
  ["makeup-brush-set", /brush set|brush kit|brushes/i],
  ["serum", /\bserum\b|concentrate\b/i],
  ["moisturiser", /moisturi[sz](er|ing cream|ing lotion)|face cream|day cream|night cream/i],
];

export function cosmeticsCategory(title = "") {
  return CATEGORY_RULES.find(([, re]) => re.test(title))?.[0] ?? null;
}

/**
 * Ceilings (UGX) per reference category and tier: the top of the Kampala range
 * with 25% headroom for larger sizes. They only bite when the landed cost allows.
 */
const CEILINGS = {
  lipstick: { budget: 60000, mid: 100000, premium: 220000 },
  foundation: { budget: 90000, mid: 160000, premium: 290000 },
  mascara: { budget: 90000, mid: 120000, premium: 190000 },
  "nail-polish": { budget: 40000, mid: 60000, premium: 120000 },
  "body-lotion": { budget: 40000, mid: 110000, premium: 260000 },
  shampoo: { budget: 50000, mid: 140000, premium: 290000 },
  sunscreen: { budget: 90000, mid: 130000, premium: 260000 },
};

export function roundCosmeticsUgx(amount) {
  const n = Number(amount) || 0;
  if (n < 20000) return Math.max(2000, Math.round(n / 500) * 500);
  return Math.max(2000, Math.round(n / 1000) * 1000);
}

function roundUp(amount) {
  const step = amount < 20000 ? 500 : 1000;
  return Math.max(2000, Math.ceil(amount / step) * step);
}

/** UK price without VAT × FX. */
export function cosmeticsLandedCostUgx(gbp) {
  const n = Number(gbp);
  return Number.isFinite(n) && n > 0 ? (n / UK_VAT) * COSMETICS_UGX_PER_GBP : null;
}

function marginFor(gbp) {
  const t = Math.min(1, Math.max(0, (gbp - 10) / 90));
  return COSMETICS_MARGIN_LOW + (COSMETICS_MARGIN_HIGH - COSMETICS_MARGIN_LOW) * t;
}

/**
 * Full pricing breakdown for one cosmetics SKU.
 * @param {number} gbp UK price incl. VAT
 * @param {{ title?: string, brand?: string }} [ctx]
 */
export function cosmeticsShelfPrice(gbp, ctx = {}) {
  const cost = cosmeticsLandedCostUgx(gbp);
  if (!cost) return null;
  const tier = cosmeticsBrandTier(ctx.brand, ctx.title);
  const category = cosmeticsCategory(ctx.title);
  const floor = roundUp(cost * COSMETICS_FLOOR_MARGIN);
  let price = roundCosmeticsUgx(cost * marginFor(Number(gbp)));
  const ceiling = CEILINGS[category]?.[tier] ?? null;
  let ceilingConflict = false;
  if (ceiling && price > ceiling) {
    price = Math.max(ceiling, floor);
    ceilingConflict = floor > ceiling;
  }
  return { price: Math.max(price, floor), floor, tier, category, ceiling, ceilingConflict };
}

export function gbpToUgandanCosmeticsPrice(gbp, ctx = {}) {
  return cosmeticsShelfPrice(gbp, ctx)?.price ?? null;
}

/** Was-price keeps the supplier's real discount ratio (RRP / "worth £X"). */
export function cosmeticsWasPrice(price, gbp, wasGbp) {
  if (!(wasGbp > gbp * 1.02)) return null;
  const was = roundCosmeticsUgx(price * (wasGbp / gbp));
  return was > price ? was : null;
}

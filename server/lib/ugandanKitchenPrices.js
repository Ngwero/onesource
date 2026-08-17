/**
 * Kampala / Uganda retail shelf prices for kitchen ware.
 *
 * Not a GBP/USD FX conversion — UK luxury catalogues were landing at
 * UGX 100k–4.7M (a spatula at ~168k). These bands match Jumia UG, Game,
 * Shoprite, and local cookware shops.
 */

const AISLE_IDS = [
  "cookware-accessories",
  "stainless-clad",
  "carbon-steel",
  "small-furniture",
  "extractor-hoods",
  "countertops-sinks",
  "cast-iron",
  "non-stick",
  "tabletop",
  "cookware",
  "organization",
].sort((a, b) => b.length - a.length);

/** Default UGX min/max by aisle when the title does not name a product type. */
export const KITCHEN_AISLE_PRICE_RANGE = {
  "cookware-accessories": [8000, 38000],
  tabletop: [5000, 42000],
  cookware: [22000, 98000],
  "non-stick": [18000, 62000],
  "cast-iron": [38000, 135000],
  "stainless-clad": [28000, 110000],
  "carbon-steel": [25000, 85000],
  organization: [10000, 48000],
  "small-furniture": [35000, 145000],
  "extractor-hoods": [180000, 380000],
  "countertops-sinks": [45000, 185000],
};

/** More specific first. Prices in UGX. */
const TITLE_RANGES = [
  { re: /cooker hood|extractor hood|wall[- ]mount(?:ed)? extractor|\bhood\b/i, range: [180000, 380000] },
  { re: /worktop|countertop|laminate/i, range: [65000, 155000] },
  { re: /\bsink\b/i, range: [70000, 185000] },
  { re: /faucet|mixer tap|\btap\b/i, range: [28000, 75000] },
  { re: /dutch oven|cocotte/i, range: [55000, 135000] },
  { re: /pressure cooker/i, range: [45000, 125000] },
  { re: /kitchen island|prep cart|utility cart|trolley/i, range: [55000, 145000] },
  { re: /step stool|\bstool\b/i, range: [22000, 65000] },
  {
    re: /\d+[-\s]?piece.+(?:set|pot)|cookware set|pot set|saucepan set/i,
    range: [45000, 125000],
  },
  { re: /casserole/i, range: [35000, 110000] },
  { re: /saut[eé] pan|saute pan/i, range: [28000, 78000] },
  { re: /frying pan|frypan|skillet/i, range: [18000, 58000] },
  { re: /pancake|cr[eê]pe/i, range: [12000, 35000] },
  { re: /saucepan|sauce pan|stock ?pot|\bwok\b|\bpot\b/i, range: [22000, 78000] },
  { re: /can opener|bottle opener|\bopener\b/i, range: [8000, 22000] },
  { re: /\bjar\b/i, range: [6000, 25000] },
  { re: /basket|caddy|\bbin\b/i, range: [8000, 35000] },
  { re: /(?=.*\blid\b)(?!.*\b(pot|pan|wok|jar|casserole|dutch|saucepan|skillet)\b)/i, range: [8000, 22000] },
  { re: /knife block|knife set|\bknives\b/i, range: [22000, 68000] },
  { re: /chef'?s knife|cook'?s knife/i, range: [12000, 35000] },
  { re: /\bknife\b/i, range: [8000, 28000] },
  { re: /cutting board|chopping board/i, range: [8000, 28000] },
  { re: /apron/i, range: [8000, 25000] },
  { re: /storage box|fridge/i, range: [8000, 28000] },
  { re: /lemon extractor|citrus|juicer/i, range: [8000, 25000] },
  { re: /pizza cutter/i, range: [6000, 15000] },
  { re: /teaspoon|espresso spoon|coffee spoon/i, range: [2500, 9000] },
  { re: /salad server/i, range: [8000, 20000] },
  { re: /cutlery|flatware/i, range: [15000, 48000] },
  { re: /\b(spoon|fork)\b/i, range: [3000, 14000] },
  { re: /tongs|skimmer|ladle|turner|peeler|whisk|spatula|slice\b/i, range: [4000, 16000] },
  { re: /champagne|wine glass|flute|cuvee/i, range: [12000, 42000] },
  { re: /beer glass|tumbler|drinking glass/i, range: [5000, 25000] },
  { re: /\b(mug|cup|glass)\b/i, range: [4000, 18000] },
  { re: /\bbowl\b/i, range: [5000, 22000] },
  { re: /\bplate\b|dinnerware|saucer/i, range: [4000, 28000] },
  { re: /baking|oven tray|\btin\b|mould|mold/i, range: [8000, 32000] },
  { re: /steamer/i, range: [18000, 55000] },
  { re: /shelf|organizer|rack|rail|drying/i, range: [10000, 45000] },
];

export function aisleIdFromKitchenProductId(productId) {
  const s = String(productId || "");
  for (const aisle of AISLE_IDS) {
    if (s.startsWith(`kitchen-${aisle}-`)) return aisle;
  }
  return null;
}

function hashStr(value) {
  let h = 2166136261;
  const s = String(value || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function roundUgx(amount) {
  const n = Number(amount) || 0;
  if (n < 20000) return Math.max(2000, Math.round(n / 500) * 500);
  return Math.max(2000, Math.round(n / 1000) * 1000);
}

function setFactor(title) {
  const t = String(title || "");
  if (/set of 1[02]|12\s*(pcs?|piece)|24\s*(pcs?|piece)/i.test(t)) return 1.55;
  if (/set of [6-9]|[6-9]\s*(pcs?|piece)/i.test(t)) return 1.3;
  if (/set of [2-5]|[2-5]\s*(pcs?|piece)|\bset\b/i.test(t)) return 1.18;
  return 1;
}

function resolveRange(aisleId, title) {
  const t = String(title || "");
  for (const rule of TITLE_RANGES) {
    if (rule.re.test(t)) {
      return { min: rule.range[0], max: rule.range[1] };
    }
  }
  const aisleRange =
    KITCHEN_AISLE_PRICE_RANGE[aisleId] || KITCHEN_AISLE_PRICE_RANGE.cookware;
  return { min: aisleRange[0], max: aisleRange[1] };
}

/**
 * Deterministic Kampala-market price for a kitchen SKU.
 * @param {{ id?: string, title?: string, aisleId?: string, premium?: boolean }} product
 */
export function ugandanKitchenPrice(product = {}) {
  const id = String(product.id || "");
  const title = String(product.title || "");
  const aisleId = product.aisleId || aisleIdFromKitchenProductId(id);
  let { min, max } = resolveRange(aisleId, title);

  const factor = setFactor(title);
  if (factor > 1) {
    min = roundUgx(min * Math.min(factor, 1.15));
    max = roundUgx(max * factor);
  }

  if (product.premium) {
    min = min + Math.round((max - min) * 0.3);
  }

  if (max < min) max = min;
  const raw = min + (hashStr(id) % (max - min + 1));
  return roundUgx(raw);
}

/** Map a UK GBP sticker to a Ugandan shelf price (not FX). */
export function gbpToUgandanKitchenPrice(gbp, product = {}) {
  const n = Number(gbp);
  const premium = Number.isFinite(n) && n >= 80;
  return ugandanKitchenPrice({ ...product, premium });
}

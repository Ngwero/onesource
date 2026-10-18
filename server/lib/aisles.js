/** Aisle ids per shop; product ids look like `{shop}-{aisle}-{sku}`. */
const AISLE_IDS = {
  kitchen: [
    "cookware",
    "stainless-clad",
    "carbon-steel",
    "cast-iron",
    "non-stick",
    "cookware-accessories",
    "small-appliances",
    "tabletop",
    "countertops-sinks",
    "organization",
  ],
  cosmetics: [
    "fragrance",
    "hair-care",
    "mens",
    "home-fragrance",
    "wellness",
    "beauty-tech-home",
    "sexual-wellness",
    "face-makeup",
    "eye-makeup",
    "lips",
    "face-eye-care",
    "serums-oils",
    "cleansers-bars",
    "sun-protection",
    "acne-care",
    "body-care",
    "hair-baby-more",
    "kits-bundles",
    "brushes-tools",
  ],
  pharmacy: [
    "medicines",
    "supplements",
    "first-aid",
    "care",
    "orthopedics",
    "wellbeing",
    "mother-child",
    "animals",
    "nutrition",
    "naturopathy",
    "sports",
    "offers",
  ],
};

export function aisleIdsForShop(shopPrefix) {
  return [...(AISLE_IDS[shopPrefix] ?? [])];
}

/** `cosmetics-fragrance-boots-123` → `boots-123` (the part that survives an aisle move). */
export function productIdWithoutAisle(shopPrefix, id) {
  const aisle = [...(AISLE_IDS[shopPrefix] ?? [])]
    .sort((a, b) => b.length - a.length)
    .find((a) => id.startsWith(`${shopPrefix}-${a}-`));
  return aisle ? id.slice(`${shopPrefix}-${aisle}-`.length) : id;
}

/**
 * Id prefixes of other aisles that a `{shop}-{aisle}-%` match would also catch,
 * e.g. `kitchen-cookware-` also matches `kitchen-cookware-accessories-…`.
 */
/**
 * Exclusive upper bound for `id >= prefix AND id < bound`, which is a primary-key
 * range. `LIKE 'prefix%'` does not reliably use that index once other filters are added.
 */
export function idPrefixUpperBound(prefix) {
  const chars = Array.from(String(prefix));
  if (!chars.length) return prefix;
  const last = chars.pop();
  const next = last.codePointAt(0) + 1;
  if (next > 0x10ffff) return `${prefix}\uffff`;
  return chars.join("") + String.fromCodePoint(next);
}

export function nestedAislePrefixes(shopPrefix, aisleId) {
  return (AISLE_IDS[shopPrefix] ?? [])
    .filter((other) => other !== aisleId && other.startsWith(`${aisleId}-`))
    .map((other) => `${shopPrefix}-${other}-`);
}

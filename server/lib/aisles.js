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
};

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
export function nestedAislePrefixes(shopPrefix, aisleId) {
  return (AISLE_IDS[shopPrefix] ?? [])
    .filter((other) => other !== aisleId && other.startsWith(`${aisleId}-`))
    .map((other) => `${shopPrefix}-${other}-`);
}

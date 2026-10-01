/** Aisle ids per shop; product ids look like `{shop}-{aisle}-{sku}`. */
const AISLE_IDS = {
  kitchen: [
    "cookware",
    "stainless-clad",
    "carbon-steel",
    "cast-iron",
    "non-stick",
    "cookware-accessories",
    "tabletop",
    "small-furniture",
    "extractor-hoods",
    "countertops-sinks",
    "organization",
  ],
  cosmetics: [
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

/**
 * Id prefixes of other aisles that a `{shop}-{aisle}-%` match would also catch,
 * e.g. `kitchen-cookware-` also matches `kitchen-cookware-accessories-…`.
 */
export function nestedAislePrefixes(shopPrefix, aisleId) {
  return (AISLE_IDS[shopPrefix] ?? [])
    .filter((other) => other !== aisleId && other.startsWith(`${aisleId}-`))
    .map((other) => `${shopPrefix}-${other}-`);
}

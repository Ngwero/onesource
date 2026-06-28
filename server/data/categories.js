/**
 * Canonical marketplace categories (stored in products.category as slug id).
 * Keep in sync with src/data/categories.ts — later replace with a categories table.
 */

export const AGRI_CATEGORIES = [
  { id: "fresh-fruits", name: "Fresh Fruits", icon: "🍎", group: "produce" },
  { id: "fresh-vegetables", name: "Fresh Vegetables", icon: "🥬", group: "produce" },
  { id: "roots-and-tubers", name: "Roots and Tubers", icon: "🥕", group: "produce" },
  { id: "cereals-and-grains", name: "Cereals and Grains", icon: "🌾", group: "produce" },
  { id: "legumes-and-pulses", name: "Legumes and Pulses", icon: "🫘", group: "produce" },
  { id: "oilseeds-and-nuts", name: "Oilseeds and Nuts", icon: "🥜", group: "produce" },
  { id: "herbs-and-spices", name: "Herbs and Spices", icon: "🌿", group: "produce" },
  {
    id: "chillies-and-peppers",
    name: "Chillies and Peppers",
    icon: "🌶️",
    group: "produce",
  },
  { id: "coffee-tea-cocoa", name: "Coffee, Tea and Cocoa", icon: "☕", group: "produce" },
  { id: "livestock-products", name: "Livestock Products", icon: "🥩", group: "livestock" },
  { id: "poultry-products", name: "Poultry Products", icon: "🍗", group: "livestock" },
  { id: "fish-and-aquaculture", name: "Fish and Aquaculture", icon: "🐟", group: "livestock" },
  { id: "dairy-products", name: "Dairy Products", icon: "🥛", group: "livestock" },
  { id: "export-fresh-produce", name: "Export Fresh Produce", icon: "✈️", group: "specialty" },
];

export const REMOVED_CATEGORY_SLUGS = new Set([
  "processed-agricultural-products",
  "animal-feeds-fodder",
  "seeds-planting-materials",
  "agro-industrial-raw-materials",
  "farm-inputs",
  "flowers-ornamental-plants",
  "organic-products",
]);

/** @type {Record<string, string>} */
export const LEGACY_CATEGORY_MAP = {
  fruit: "fresh-fruits",
  berries: "fresh-fruits",
  citrus: "fresh-fruits",
  tropical: "fresh-fruits",
  vegetables: "fresh-vegetables",
  "salad-herbs": "fresh-vegetables",
  "root-veg": "roots-and-tubers",
  "root-crops-and-tubers": "roots-and-tubers",
};

export const UNCATEGORIZED_CATEGORY_ID = "uncategorized";

export function normalizeCategoryId(raw) {
  if (!raw || !String(raw).trim()) return UNCATEGORIZED_CATEGORY_ID;
  const trimmed = String(raw).trim();
  if (REMOVED_CATEGORY_SLUGS.has(trimmed)) return UNCATEGORIZED_CATEGORY_ID;
  const mapped = LEGACY_CATEGORY_MAP[trimmed] ?? trimmed;
  if (REMOVED_CATEGORY_SLUGS.has(mapped)) return UNCATEGORIZED_CATEGORY_ID;
  if (AGRI_CATEGORIES.some((c) => c.id === mapped)) return mapped;
  const byName = AGRI_CATEGORIES.find(
    (c) => c.name.toLowerCase() === mapped.toLowerCase()
  );
  if (byName) return byName.id;
  return mapped;
}

export function getCategoryById(id) {
  const normalized = normalizeCategoryId(id);
  return AGRI_CATEGORIES.find((c) => c.id === normalized);
}

/** @param {string} categoryId */
export function categoryMatchAliases(categoryId) {
  const trimmed = String(categoryId).trim();
  const normalized = normalizeCategoryId(trimmed);

  if (REMOVED_CATEGORY_SLUGS.has(trimmed)) {
    return [trimmed];
  }

  const aliases = new Set([normalized, trimmed]);
  for (const [legacy, target] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (target === normalized) aliases.add(legacy);
  }
  return [...aliases];
}

/** @param {string} productCategory @param {string} filterCategoryId */
export function productMatchesCategory(productCategory, filterCategoryId) {
  if (!filterCategoryId) return true;
  const raw = String(productCategory ?? "").trim();
  if (!raw) return normalizeCategoryId(filterCategoryId) === UNCATEGORIZED_CATEGORY_ID;

  const filterTrimmed = String(filterCategoryId).trim();
  if (REMOVED_CATEGORY_SLUGS.has(filterTrimmed)) {
    return raw === filterTrimmed;
  }

  const aliases = categoryMatchAliases(filterTrimmed);
  if (aliases.includes(raw)) return true;

  return normalizeCategoryId(raw) === normalizeCategoryId(filterTrimmed);
}

export const categories = AGRI_CATEGORIES.map(({ id, name, icon }) => ({
  id,
  name,
  icon,
}));

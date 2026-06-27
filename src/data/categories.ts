import type { Category } from "../types/product";

/** Canonical category — `id` is stored in Supabase `products.category`. */
export type CategoryDefinition = {
  id: string;
  name: string;
  icon: string;
  group: "produce" | "livestock" | "processed" | "specialty";
};

export const AGRI_CATEGORIES: CategoryDefinition[] = [
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

/** Hidden from shop — existing products remap to uncategorized via normalizeCategoryId */
export const REMOVED_CATEGORY_SLUGS = new Set([
  "processed-agricultural-products",
  "animal-feeds-fodder",
  "seeds-planting-materials",
  "agro-industrial-raw-materials",
  "farm-inputs",
  "flowers-ornamental-plants",
  "organic-products",
]);

/** Maps legacy demo category slugs → new agricultural slugs. */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
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

export const CATEGORY_GROUPS: { id: CategoryDefinition["group"]; labelKey: string }[] = [
  { id: "produce", labelKey: "categories.groups.produce" },
  { id: "livestock", labelKey: "categories.groups.livestock" },
  { id: "specialty", labelKey: "categories.groups.specialty" },
];

export function normalizeCategoryId(raw: string | null | undefined): string {
  if (!raw?.trim()) return UNCATEGORIZED_CATEGORY_ID;
  const trimmed = raw.trim();
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

export function getCategoryById(id: string): CategoryDefinition | undefined {
  const normalized = normalizeCategoryId(id);
  return AGRI_CATEGORIES.find((c) => c.id === normalized);
}

/** All product.category values that belong in a category listing (for API + client filters). */
export function categoryMatchAliases(categoryId: string): string[] {
  const trimmed = categoryId.trim();
  const normalized = normalizeCategoryId(trimmed);

  if (REMOVED_CATEGORY_SLUGS.has(trimmed)) {
    return [trimmed];
  }

  const aliases = new Set<string>([normalized, trimmed]);
  for (const [legacy, target] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (target === normalized) aliases.add(legacy);
  }
  return [...aliases];
}

export function productMatchesCategory(
  productCategory: string,
  filterCategoryId: string
): boolean {
  if (!filterCategoryId) return true;
  const raw = (productCategory ?? "").trim();
  if (!raw) return normalizeCategoryId(filterCategoryId) === UNCATEGORIZED_CATEGORY_ID;

  const filterTrimmed = filterCategoryId.trim();
  if (REMOVED_CATEGORY_SLUGS.has(filterTrimmed)) {
    return raw === filterTrimmed;
  }

  const aliases = categoryMatchAliases(filterTrimmed);
  if (aliases.includes(raw)) return true;

  return normalizeCategoryId(raw) === normalizeCategoryId(filterTrimmed);
}

export function getCategoryDisplayName(
  categoryId: string,
  translate?: (key: string, opts?: { defaultValue?: string }) => string
): string {
  const trimmed = categoryId.trim();
  if (REMOVED_CATEGORY_SLUGS.has(trimmed)) {
    if (translate) {
      return translate(`categories.names.${trimmed}`, {
        defaultValue: trimmed.replace(/-/g, " "),
      });
    }
    return trimmed.replace(/-/g, " ");
  }
  const normalized = normalizeCategoryId(categoryId);
  const def = getCategoryById(normalized);
  if (translate) {
    return translate(`categories.names.${normalized}`, {
      defaultValue: def?.name ?? categoryId,
    });
  }
  return def?.name ?? categoryId;
}

export const categories: Category[] = AGRI_CATEGORIES.map(({ id, name, icon }) => ({
  id,
  name,
  icon,
  image: undefined,
}));

/** Banner for shop-by-category: admin image, else first product in category. */
export function getCategoryBannerImage(
  category: Category,
  productImage?: string
): string | undefined {
  return category.image?.trim() || productImage;
}

import type { Category, Product } from "../types/product";
import { normalizeCategoryId } from "./categories";
import { EXPORT_CATEGORY_ID } from "../utils/exportOrder";
import { isSpecialtyProduct } from "../utils/shopMode";

export type HomeRowConfig = {
  id: string;
  titleKey: string;
  title: string;
  seeAllCategoryId?: string;
  seeAllSearch?: string;
};

export type HomeCategoryRow = { row: HomeRowConfig; products: Product[] };

/** Skip near-empty aisles on Fresh home (herbs=2, dairy=3, chillies=0). */
export const FRESH_HOME_MIN_CATEGORY_PRODUCTS = 6;

/**
 * High-count Fresh category aisles in a produce-first order with protein
 * interleaved. Counts from shop=fresh (excl. export): fruits 119, veg 16,
 * fish 16, oilseeds 15, roots 13, cereals 11, legumes/livestock/poultry 10,
 * coffee 9.
 */
export const FRESH_HOME_CATEGORY_ORDER = [
  "fresh-fruits",
  "poultry-products",
  "fresh-vegetables",
  "fish-and-aquaculture",
  "oilseeds-and-nuts",
  "roots-and-tubers",
  "livestock-products",
  "cereals-and-grains",
  "legumes-and-pulses",
  "coffee-tea-cocoa",
] as const;

type ThemedRowDef = {
  id: string;
  titleKey: string;
  title: string;
  seeAllCategoryId?: string;
  seeAllSearch?: string;
  /** Minimum matching products in the catalogue before the row is shown. */
  minProducts: number;
  match: (product: Product) => boolean;
};

function titleMatches(product: Product, pattern: RegExp): boolean {
  return pattern.test(product.title);
}

/**
 * High-count produce varieties that are not their own AGRI category.
 * Placed above the broad Fresh Fruits row so shoppers see packed aisles first.
 */
function isSoftDrinkTitle(product: Product): boolean {
  return titleMatches(product, /\bfanta\b|\bsoda\b|\bcoca[\s-]?cola\b|\bsprite\b|\bpepsi\b/i);
}

export const FRESH_HOME_THEMED_ROWS: ThemedRowDef[] = [
  {
    id: "berries",
    titleKey: "home.rows.berries",
    title: "Berries",
    seeAllSearch: "berry",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /blueberr|raspberr|strawberr|blackberr|\bberry|\bberries\b/i),
  },
  {
    id: "mangoes",
    titleKey: "home.rows.mangoes",
    title: "Mangoes",
    seeAllSearch: "mango",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /mango/i),
  },
  {
    id: "pawpaw",
    titleKey: "home.rows.pawpaw",
    title: "Pawpaw",
    seeAllSearch: "pawpaw",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /paw\s*paw|papaya/i),
  },
  {
    id: "passion-fruit",
    titleKey: "home.rows.passionFruit",
    title: "Passion fruit",
    seeAllSearch: "passion",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /passion/i),
  },
  {
    id: "avocado",
    titleKey: "home.rows.avocado",
    title: "Avocado",
    seeAllSearch: "avocado",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /avocado/i),
  },
  {
    id: "apples",
    titleKey: "home.rows.apples",
    title: "Apples",
    seeAllSearch: "apple",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /\bapples?\b/i),
  },
  {
    id: "citrus",
    titleKey: "home.rows.citrus",
    title: "Oranges & citrus",
    seeAllSearch: "orange",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) =>
      titleMatches(p, /\b(?:oranges?|tangerines?|mandarins?|citrus|lemons?|limes?)\b/i) &&
      !titleMatches(p, /potato/i),
  },
  {
    id: "pineapple",
    titleKey: "home.rows.pineapple",
    title: "Pineapple",
    seeAllSearch: "pineapple",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /pine\s*apple/i) && !isSoftDrinkTitle(p),
  },
  {
    id: "watermelon",
    titleKey: "home.rows.watermelon",
    title: "Watermelon",
    seeAllSearch: "watermelon",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /watermelon/i),
  },
  {
    id: "bananas",
    titleKey: "home.rows.bananas",
    title: "Bananas",
    seeAllSearch: "banana",
    seeAllCategoryId: "fresh-fruits",
    minProducts: 6,
    match: (p) => titleMatches(p, /banana|plantain|matoke/i),
  },
  {
    id: "tomatoes",
    titleKey: "home.rows.tomatoes",
    title: "Tomatoes",
    seeAllSearch: "tomato",
    seeAllCategoryId: "fresh-vegetables",
    minProducts: 6,
    match: (p) => titleMatches(p, /tomato/i),
  },
  {
    id: "onions",
    titleKey: "home.rows.onions",
    title: "Onions",
    seeAllSearch: "onion",
    seeAllCategoryId: "fresh-vegetables",
    minProducts: 6,
    match: (p) => titleMatches(p, /onion|shallot/i),
  },
  {
    id: "potatoes",
    titleKey: "home.rows.potatoes",
    title: "Potatoes & roots",
    seeAllSearch: "potato",
    seeAllCategoryId: "roots-and-tubers",
    minProducts: 6,
    match: (p) =>
      normalizeCategoryId(p.category) === "roots-and-tubers" ||
      titleMatches(p, /potato|yam|cassava|irish/i),
  },
  {
    id: "chicken",
    titleKey: "home.rows.chicken",
    title: "Chicken",
    seeAllSearch: "chicken",
    seeAllCategoryId: "poultry-products",
    minProducts: 6,
    match: (p) =>
      !titleMatches(p, /\beggs?\b/i) &&
      (normalizeCategoryId(p.category) === "poultry-products" ||
        titleMatches(p, /chicken|broiler|poultry|drumstick|thigh|wing/i)),
  },
  {
    id: "tilapia",
    titleKey: "home.rows.tilapia",
    title: "Tilapia",
    seeAllSearch: "tilapia",
    seeAllCategoryId: "fish-and-aquaculture",
    minProducts: 6,
    match: (p) => titleMatches(p, /tilapia/i),
  },
  {
    id: "beef",
    titleKey: "home.rows.beef",
    title: "Beef, lamb & goat",
    seeAllSearch: "beef",
    seeAllCategoryId: "livestock-products",
    minProducts: 6,
    match: (p) =>
      normalizeCategoryId(p.category) === "livestock-products" ||
      titleMatches(p, /beef|lamb|goat|mutton/i),
  },
];

/** Spread varieties across a row instead of leading with one import batch. */
function mixCategoryProducts(products: Product[]): Product[] {
  const varieties = new Map<string, Product[]>();
  for (const product of products) {
    const name = product.title.split(/\s+[–—]\s+/)[0].trim().toLowerCase();
    const variants = varieties.get(name) ?? [];
    variants.push(product);
    varieties.set(name, variants);
  }
  const mixed: Product[] = [];
  for (let index = 0; mixed.length < products.length; index++) {
    for (const variants of varieties.values()) {
      if (variants[index]) mixed.push(variants[index]);
    }
  }
  return mixed;
}

/** Identify the original photo even when cards use different resize URLs. */
export function homeImageKey(image: string): string {
  const value = image.trim();
  if (!value || /(?:^|\/)placeholders\//i.test(value)) return "";
  if (value.startsWith("data:")) return value;
  try {
    const url = new URL(value, "https://www.onesourco.com");
    if (url.pathname === "/api/img") {
      const source = url.searchParams.get("src");
      if (source && !source.includes("/api/img")) return homeImageKey(source);
    }
    url.hash = "";
    if (url.hostname.endsWith(".supabase.co") &&
        /\/storage\/v1\/(?:object|render\/image)\/public\//.test(url.pathname)) {
      url.pathname = url.pathname.replace("/render/image/", "/object/");
      url.search = "";
    } else {
      for (const param of ["w", "h", "width", "height", "q", "quality", "fit", "crop", "auto", "fm", "format", "dpr", "resize"]) {
        url.searchParams.delete(param);
      }
      url.searchParams.sort();
    }
    return url.href;
  } catch {
    return value;
  }
}

function isFreshHomeProduct(product: Product): boolean {
  if (product.published === false || isSpecialtyProduct(product)) return false;
  return normalizeCategoryId(product.category) !== EXPORT_CATEGORY_ID;
}

function pickUniqueProducts(
  candidates: Product[],
  usedProducts: Set<string>,
  usedImages: Set<string>,
  limit: number,
): Product[] {
  const selected: Product[] = [];
  for (const product of mixCategoryProducts(candidates)) {
    if (selected.length >= limit) break;
    if (usedProducts.has(product.id)) continue;
    const image = [product.image, ...(product.images ?? [])].find((candidate) => {
      const key = homeImageKey(candidate);
      return key !== "" && !usedImages.has(key);
    });
    if (!image) continue;
    usedProducts.add(product.id);
    usedImages.add(homeImageKey(image));
    selected.push(image === product.image ? product : { ...product, image });
  }
  return selected;
}

function categoryDisplayName(categories: Category[], id: string): string {
  return categories.find((c) => normalizeCategoryId(c.id) === id)?.name ?? id;
}

/**
 * Fresh home shelves: packed produce variety rows first, then high-count
 * category aisles. Near-empty categories and export sodas stay off the page.
 * No reused product or photo across rows.
 */
export function buildHomeCategoryRows(
  products: Product[],
  categories: Category[],
  limit = 12,
): HomeCategoryRow[] {
  if (limit <= 0) return [];

  const catalog = products.filter(isFreshHomeProduct);
  const grouped = new Map<string, Product[]>();
  for (const product of catalog) {
    const category = normalizeCategoryId(product.category);
    const pool = grouped.get(category) ?? [];
    pool.push(product);
    grouped.set(category, pool);
  }

  const usedProducts = new Set<string>();
  const usedImages = new Set<string>();
  const rows: HomeCategoryRow[] = [];

  for (const themed of FRESH_HOME_THEMED_ROWS) {
    const matched = catalog.filter(themed.match);
    if (matched.length < themed.minProducts) continue;
    const selected = pickUniqueProducts(matched, usedProducts, usedImages, limit);
    if (selected.length < 2) continue;
    rows.push({
      row: {
        id: themed.id,
        titleKey: themed.titleKey,
        title: themed.title,
        seeAllCategoryId: themed.seeAllCategoryId,
        seeAllSearch: themed.seeAllSearch,
      },
      products: selected,
    });
  }

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  for (const id of FRESH_HOME_CATEGORY_ORDER) {
    if (seen.has(id)) continue;
    seen.add(id);
    orderedIds.push(id);
  }
  // Any other strong Fresh category not in the pinned list (by catalogue size).
  const extras = [...grouped.entries()]
    .filter(([id, pool]) => !seen.has(id) && pool.length >= FRESH_HOME_MIN_CATEGORY_PRODUCTS)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id]) => id);
  orderedIds.push(...extras);

  for (const id of orderedIds) {
    const pool = grouped.get(id) ?? [];
    if (pool.length < FRESH_HOME_MIN_CATEGORY_PRODUCTS) continue;
    const selected = pickUniqueProducts(pool, usedProducts, usedImages, limit);
    if (!selected.length) continue;
    rows.push({
      row: {
        id,
        titleKey: `categories.names.${id}`,
        title: categoryDisplayName(categories, id),
        seeAllCategoryId: id,
      },
      products: selected,
    });
  }

  return rows;
}

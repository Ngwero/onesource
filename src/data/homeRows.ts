import type { Product } from "../types/product";
import { normalizeCategoryId } from "./categories";

const CHILLIES_CATEGORY_ID = "chillies-and-peppers";

/** Subtype patterns — one product per type picked first for a mixed home row. */
const CHILLI_MIX_TYPES: { id: string; re: RegExp }[] = [
  { id: "green", re: /green chilli/i },
  { id: "red", re: /red chilli/i },
  { id: "scotch", re: /scotch bonnet/i },
  { id: "habanero", re: /habanero/i },
  { id: "peri", re: /piri piri|peri-peri|peri peri/i },
  { id: "bird", re: /bird'?s eye/i },
  { id: "cayenne", re: /cayenne/i },
  { id: "thai", re: /thai chilli/i },
  { id: "jalapeno", re: /jalapeño|jalapeno/i },
  { id: "serrano", re: /serrano/i },
  { id: "dried", re: /dried.*chilli|sun-dried/i },
  { id: "sauce", re: /chilli sauce|hot pepper sauce|chilli paste|chilli powder|chilli flakes/i },
];

function isChilliProduct(p: Product): boolean {
  if (normalizeCategoryId(p.category) === CHILLIES_CATEGORY_ID) return true;
  const hay = `${p.title} ${p.description}`;
  return /chilli|chili|habanero|scotch bonnet|piri piri|peri-peri|jalapeño|jalapeno|cayenne|serrano/i.test(
    hay
  );
}

function mixChilliProducts(products: Product[], limit: number): Product[] {
  const pool = products.filter(isChilliProduct);
  const used = new Set<string>();
  const mixed: Product[] = [];

  const takeFrom = (list: Product[]) => {
    for (const p of list) {
      if (used.has(p.id)) continue;
      mixed.push(p);
      used.add(p.id);
      return true;
    }
    return false;
  };

  for (const { re } of CHILLI_MIX_TYPES) {
    if (mixed.length >= limit) break;
    const bucket = pool.filter((p) => re.test(p.title) || re.test(p.description));
    takeFrom(bucket);
  }

  let i = 0;
  while (mixed.length < limit && i < pool.length) {
    const p = pool[i++];
    if (!used.has(p.id)) {
      mixed.push(p);
      used.add(p.id);
    }
  }

  return mixed.slice(0, limit);
}

export type HomeRowConfig = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  seeAllSearch?: string;
  seeAllCategoryId?: string;
  seeAllHref?: string;
  match: (product: Product) => boolean;
};

export const HOME_PRODUCT_ROWS: HomeRowConfig[] = [
  {
    id: "fresh-deals",
    titleKey: "home.rows.freshDeals",
    subtitleKey: "home.rows.freshDealsSub",
    seeAllHref: "/products?sale=1",
    match: (p) => p.originalPrice != null && p.originalPrice > p.price,
  },
  {
    id: "chillies",
    titleKey: "home.rows.chillies",
    subtitleKey: "home.rows.chilliesSub",
    seeAllCategoryId: CHILLIES_CATEGORY_ID,
    seeAllSearch: "chilli",
    match: isChilliProduct,
  },
  {
    id: "mangoes",
    titleKey: "home.rows.mangoes",
    subtitleKey: "home.rows.mangoesSub",
    seeAllSearch: "mango",
    match: (p) => /mango/i.test(p.title) || /mango/i.test(p.description),
  },
  {
    id: "chicken",
    titleKey: "home.rows.chicken",
    subtitleKey: "home.rows.chickenSub",
    seeAllSearch: "chicken",
    seeAllCategoryId: "poultry-products",
    match: (p) =>
      normalizeCategoryId(p.category) === "poultry-products" ||
      /chicken/i.test(p.title),
  },
  {
    id: "fish",
    titleKey: "home.rows.fish",
    subtitleKey: "home.rows.fishSub",
    seeAllSearch: "fish",
    seeAllCategoryId: "fish-and-aquaculture",
    match: (p) =>
      normalizeCategoryId(p.category) === "fish-and-aquaculture" ||
      /fish|tilapia|smoked|aquaculture/i.test(p.title),
  },
  {
    id: "eggs",
    titleKey: "home.rows.eggs",
    subtitleKey: "home.rows.eggsSub",
    seeAllSearch: "egg",
    seeAllCategoryId: "poultry-products",
    match: (p) => /\begg/i.test(p.title) && !/eggplant/i.test(p.title),
  },
];

function dealSavings(p: Product): number {
  if (!p.originalPrice || p.originalPrice <= p.price) return 0;
  return (p.originalPrice - p.price) / p.originalPrice;
}

export function productsForHomeRow(products: Product[], row: HomeRowConfig, limit = 12): Product[] {
  if (row.id === "chillies") {
    const mixed = mixChilliProducts(products, limit);
    if (mixed.length >= 4) return mixed;
  }

  let matched = products.filter(row.match);
  if (row.id === "fresh-deals") {
    matched = [...matched].sort((a, b) => dealSavings(b) - dealSavings(a));
  }
  if (matched.length >= 4) return matched.slice(0, limit);
  if (row.seeAllCategoryId) {
    const fromCat = products.filter(
      (p) => normalizeCategoryId(p.category) === row.seeAllCategoryId
    );
    const ids = new Set(matched.map((p) => p.id));
    for (const p of fromCat) {
      if (!ids.has(p.id)) matched.push(p);
      if (matched.length >= limit) break;
    }
  }
  return matched.slice(0, limit);
}

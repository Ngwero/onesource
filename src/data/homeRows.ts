import type { Category, Product } from "../types/product";
import { normalizeCategoryId } from "./categories";
import { isSpecialtyProduct } from "../utils/shopMode";

export type HomeRowConfig = {
  id: string;
  titleKey: string;
  title: string;
  seeAllCategoryId: string;
};

export type HomeCategoryRow = { row: HomeRowConfig; products: Product[] };

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

/** One row per populated category, with no reused product or photo on the page. */
export function buildHomeCategoryRows(
  products: Product[],
  categories: Category[],
  limit = 12,
): HomeCategoryRow[] {
  if (limit <= 0) return [];
  const grouped = new Map<string, Product[]>();
  for (const product of products) {
    if (product.published === false || isSpecialtyProduct(product)) continue;
    const category = normalizeCategoryId(product.category);
    const pool = grouped.get(category) ?? [];
    pool.push(product);
    grouped.set(category, pool);
  }

  const usedProducts = new Set<string>();
  const usedImages = new Set<string>();
  const usedCategories = new Set<string>();
  const rows: HomeCategoryRow[] = [];
  for (const category of categories) {
    const id = normalizeCategoryId(category.id);
    if (usedCategories.has(id)) continue;
    usedCategories.add(id);
    const selected: Product[] = [];
    for (const product of mixCategoryProducts(grouped.get(id) ?? [])) {
      if (selected.length >= limit) break;
      if (usedProducts.has(product.id)) continue;
      // A gallery photo can give variants a distinct preview without repeating
      // the same cover image throughout the home page.
      const image = [product.image, ...(product.images ?? [])].find((candidate) => {
        const key = homeImageKey(candidate);
        return key !== "" && !usedImages.has(key);
      });
      if (!image) continue;
      usedProducts.add(product.id);
      usedImages.add(homeImageKey(image));
      selected.push(image === product.image ? product : { ...product, image });
    }
    if (selected.length) {
      rows.push({
        row: {
          id,
          titleKey: `categories.names.${id}`,
          title: category.name,
          seeAllCategoryId: id,
        },
        products: selected,
      });
    }
  }
  return rows;
}

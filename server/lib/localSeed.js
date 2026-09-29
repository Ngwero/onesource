import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { rowToProduct, seedRowFromJson } from "../db.js";
import { categoryMatchAliases } from "../data/categories.js";
import { isSupabaseConnectionError, supabaseConnectionHint } from "./supabaseErrors.js";
import { productMatchesSearch, rankSearchResults } from "./productSearchMatch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, "..", "seed-data.json");

let rows = null;
let warned = false;

function loadRows() {
  if (!rows) {
    const raw = JSON.parse(readFileSync(SEED_PATH, "utf8"));
    rows = raw.map(seedRowFromJson);
  }
  return rows;
}

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    `[local-seed] ${supabaseConnectionHint()} Serving ${loadRows().length} products from seed-data.json.`
  );
}

export function filterLocalProducts({
  admin = false,
  category,
  search,
  page = 0,
  pageSize = 1000,
  shop,
  aisle,
} = {}) {
  let filtered = loadRows();
  if (!admin) {
    filtered = filtered.filter((r) => r.in_stock && r.stock_quantity > 0);
  }
  if (category) {
    const aliases = categoryMatchAliases(category);
    filtered = filtered.filter((r) => aliases.includes(r.category));
  }
  const aisleId = String(aisle ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const shopPrefix = shop === "cosmetics" ? "cosmetics" : "kitchen";
  const shopCategory = shop === "cosmetics" ? "cosmetics" : "kitchen-ware";
  if (shop === "fresh") {
    filtered = filtered.filter((r) => {
      const id = String(r.id);
      return (
        !id.startsWith("kitchen-") &&
        !id.startsWith("cosmetics-") &&
        r.category !== "kitchen-ware" &&
        r.category !== "cosmetics"
      );
    });
  } else if (aisleId) {
    const prefix = `${shopPrefix}-${aisleId}-`;
    filtered = filtered.filter((r) => String(r.id).startsWith(prefix));
  } else if ((shop === "kitchen" || shop === "cosmetics") && !category) {
    filtered = filtered.filter(
      (r) => String(r.id).startsWith(`${shopPrefix}-`) || r.category === shopCategory
    );
  }
  if (search) {
    const all = rankSearchResults(
      filtered.map(rowToProduct).filter((p) => productMatchesSearch(p, search)),
      search
    );
    const from = page * pageSize;
    return { products: all.slice(from, from + pageSize), total: all.length };
  }
  const from = page * pageSize;
  const slice = filtered.slice(from, from + pageSize);
  return { products: slice.map(rowToProduct), total: filtered.length };
}

export function getLocalProductById(id) {
  const row = loadRows().find((r) => r.id === id);
  return row ? rowToProduct(row) : null;
}

export function localProductCount() {
  return loadRows().length;
}

export async function withLocalProductFallback(query, options = {}) {
  try {
    return await query();
  } catch (error) {
    if (!isSupabaseConnectionError(error)) throw error;
    warnOnce();
    if (options.productId) {
      const product = getLocalProductById(options.productId);
      if (!product) {
        const err = new Error("Product not found");
        err.status = 404;
        throw err;
      }
      return { product, source: "local-seed" };
    }
    const products = filterLocalProducts(options);
    return {
      products: products.products,
      total: products.total,
      source: "local-seed",
    };
  }
}

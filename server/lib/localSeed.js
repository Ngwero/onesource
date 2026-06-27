import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { rowToProduct, seedRowFromJson } from "../db.js";
import { categoryMatchAliases } from "../data/categories.js";
import { isSupabaseConnectionError, supabaseConnectionHint } from "./supabaseErrors.js";

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

export function filterLocalProducts({ admin = false, category, search, page = 0, pageSize = 1000 } = {}) {
  let filtered = loadRows();
  if (!admin) {
    filtered = filtered.filter((r) => r.in_stock && r.stock_quantity > 0);
  }
  if (category) {
    const aliases = categoryMatchAliases(category);
    filtered = filtered.filter((r) => aliases.includes(r.category));
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }
  const from = page * pageSize;
  const slice = filtered.slice(from, from + pageSize);
  return slice.map(rowToProduct);
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
    return { products, total: products.length, source: "local-seed" };
  }
}

import { rowToProduct } from "../db.js";
import { categoryMatchAliases } from "../data/categories.js";
import { hasPublishedColumn } from "./productColumns.js";

/**
 * Admin catalogue queries. The products table is tens of thousands of rows with a
 * heavy jsonb `details` column, so list views fetch slim columns one page at a time
 * and dashboard numbers come from a cached aggregate — never `select *` over everything.
 */

const BASE_COLUMNS = [
  "id",
  "title",
  "price",
  "original_price",
  "rating",
  "review_count",
  "image",
  "category",
  "unit",
  "prime",
  "in_stock",
  "stock_quantity",
  "supplier_id",
  "created_at",
  "updated_at",
];

const SORT_COLUMNS = {
  id: "id",
  updatedAt: "updated_at",
  createdAt: "created_at",
  title: "title",
  category: "category",
  price: "price",
  originalPrice: "original_price",
  rating: "rating",
  stockQuantity: "stock_quantity",
};

export const MAX_ADMIN_PAGE_SIZE = 500;

export function isStatementTimeout(error) {
  return (
    error?.code === "57014" ||
    /statement timeout|canceling statement/i.test(String(error?.message ?? ""))
  );
}

async function listColumns(db) {
  const cols = [...BASE_COLUMNS];
  if (await hasPublishedColumn(db)) cols.push("published");
  return cols.join(",");
}

function toListProduct(row) {
  const { details: _details, description: _description, ...rest } = rowToProduct(row);
  return rest;
}

function quote(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Search terms safe for PostgREST `ilike` inside an `or=(...)` group. */
function searchTokens(raw) {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[%*]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1)
    .slice(0, 5);
}

async function supplierIdsMatching(db, token) {
  const { data, error } = await db
    .from("suppliers")
    .select("id")
    .ilike("business_name", `%${token}%`)
    .limit(50);
  if (error) return [];
  return (data ?? []).map((r) => r.id);
}

export function parseAdminListQuery(query) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_ADMIN_PAGE_SIZE,
    Math.max(1, parseInt(query.pageSize ?? "50", 10) || 50)
  );
  const sortKey = SORT_COLUMNS[query.sort] ? String(query.sort) : "updatedAt";
  const dir = String(query.dir ?? "").toLowerCase() === "asc" ? "asc" : "desc";
  const ids = String(query.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_ADMIN_PAGE_SIZE);
  return {
    page,
    pageSize,
    sortKey,
    dir,
    ids,
    q: String(query.q ?? "").trim().slice(0, 100),
    category: String(query.category ?? "").trim(),
    supplier: String(query.supplier ?? "").trim(),
    stock: ["in", "low", "out"].includes(query.stock) ? query.stock : "",
    prime: ["yes", "no"].includes(query.prime) ? query.prime : "",
    sale: query.sale === "yes",
  };
}

/** Sync on purpose: Supabase builders are thenable. */
function applyAdminFilters(query, params, supplierMatches) {
  if (params.ids.length) query = query.in("id", params.ids);
  if (params.category) query = query.in("category", categoryMatchAliases(params.category));
  if (params.supplier === "platform") query = query.is("supplier_id", null);
  else if (params.supplier) query = query.eq("supplier_id", params.supplier);
  if (params.stock === "in") query = query.eq("in_stock", true).gt("stock_quantity", 0);
  else if (params.stock === "low") query = query.gt("stock_quantity", 0).lte("stock_quantity", 10);
  else if (params.stock === "out") query = query.or("in_stock.eq.false,stock_quantity.lte.0");
  if (params.prime === "yes") query = query.eq("prime", true);
  else if (params.prime === "no") query = query.eq("prime", false);
  if (params.sale) query = query.not("original_price", "is", null);

  // Title / SKU / category / supplier name. Descriptions are skipped: scanning
  // them across the whole table is what pushed admin searches past the timeout.
  for (const token of searchTokens(params.q)) {
    const like = quote(`%${token}%`);
    const parts = [`title.ilike.${like}`, `id.ilike.${like}`, `category.ilike.${like}`];
    const supplierIds = supplierMatches.get(token) ?? [];
    if (supplierIds.length) parts.push(`supplier_id.in.(${supplierIds.map(quote).join(",")})`);
    query = query.or(parts.join(","));
  }
  return query;
}

function applyAdminSort(query, params) {
  const column = SORT_COLUMNS[params.sortKey] ?? "updated_at";
  return query
    .order(column, { ascending: params.dir === "asc", nullsFirst: false })
    .order("id", { ascending: true });
}

export async function listAdminProducts(db, params) {
  const columns = await listColumns(db);
  const supplierMatches = new Map();
  for (const token of searchTokens(params.q)) {
    supplierMatches.set(token, await supplierIdsMatching(db, token));
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  const run = (count) =>
    applyAdminSort(
      applyAdminFilters(db.from("products").select(columns, { count }), params, supplierMatches),
      params
    ).range(from, to);

  let countMode = "exact";
  let result = await run("exact");
  if (result.error && isStatementTimeout(result.error)) {
    countMode = "planned";
    result = await run("planned");
  }
  if (result.error) throw result.error;

  let products = (result.data ?? []).map(toListProduct);
  if (params.sale) {
    products = products.filter((p) => p.originalPrice != null && p.originalPrice > p.price);
  }
  return {
    products,
    total: result.count ?? from + products.length,
    totalExact: countMode === "exact",
    page: params.page,
    pageSize: params.pageSize,
  };
}

const SUMMARY_TTL_MS = 2 * 60 * 1000;
const SCAN_PAGE = 1000;
const SCAN_CONCURRENCY = 6;
let summaryCache = null;
let summaryInFlight = null;

function emptySummary() {
  return {
    total: 0,
    live: 0,
    out: 0,
    low: 0,
    healthy: 0,
    units: 0,
    stockValue: 0,
    byCategory: {},
  };
}

function tallyRow(s, row) {
  const qty = Number(row.stock_quantity ?? 0);
  const inStock = Boolean(row.in_stock) && qty > 0;
  s.total += 1;
  if (inStock) s.live += 1;
  else s.out += 1;
  if (qty > 0 && qty <= 10) s.low += 1;
  if (inStock && qty > 10) s.healthy += 1;
  s.units += qty;
  s.stockValue += Number(row.price ?? 0) * qty;
  const cat = row.category || "uncategorized";
  s.byCategory[cat] = (s.byCategory[cat] ?? 0) + 1;
}

/** Fast path: SQL function from supabase/admin-performance.sql, if installed. */
async function summaryFromRpc(db) {
  const { data, error } = await db.rpc("admin_product_stats");
  if (error || !data) return null;
  const s = emptySummary();
  Object.assign(s, {
    total: Number(data.total ?? 0),
    live: Number(data.live ?? 0),
    out: Number(data.out ?? 0),
    low: Number(data.low ?? 0),
    healthy: Number(data.healthy ?? 0),
    units: Number(data.units ?? 0),
    stockValue: Number(data.stock_value ?? 0),
    byCategory: data.by_category ?? {},
  });
  return s;
}

/** Fallback: many small primary-key-ordered reads instead of one big statement. */
async function summaryFromScan(db) {
  const { count, error } = await db
    .from("products")
    .select("id", { count: "planned", head: true });
  if (error) throw error;
  // Planned counts are estimates; scan a little past them and stop on a short page.
  const pages = Math.ceil(((count ?? 0) * 1.1 + SCAN_PAGE) / SCAN_PAGE);
  const s = emptySummary();
  let next = 0;
  let done = false;
  async function worker() {
    while (!done && next < pages) {
      const from = next++ * SCAN_PAGE;
      let attempt = await db
        .from("products")
        .select("category,in_stock,stock_quantity,price")
        .order("id", { ascending: true })
        .range(from, from + SCAN_PAGE - 1);
      if (attempt.error && isStatementTimeout(attempt.error)) {
        attempt = await db
          .from("products")
          .select("category,in_stock,stock_quantity,price")
          .order("id", { ascending: true })
          .range(from, from + SCAN_PAGE - 1);
      }
      if (attempt.error) throw attempt.error;
      const rows = attempt.data ?? [];
      for (const row of rows) tallyRow(s, row);
      if (rows.length < SCAN_PAGE) done = true;
    }
  }
  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker));
  // Rows past the estimate (fast-growing table): keep reading until a short page.
  for (let from = pages * SCAN_PAGE; !done; from += SCAN_PAGE) {
    const { data, error: err } = await db
      .from("products")
      .select("category,in_stock,stock_quantity,price")
      .order("id", { ascending: true })
      .range(from, from + SCAN_PAGE - 1);
    if (err) throw err;
    for (const row of data ?? []) tallyRow(s, row);
    if ((data ?? []).length < SCAN_PAGE) done = true;
  }
  return s;
}

async function computeSummary(db) {
  const startedAt = Date.now();
  const summary = (await summaryFromRpc(db)) ?? (await summaryFromScan(db));
  return { ...summary, computedAt: new Date().toISOString(), ms: Date.now() - startedAt };
}

/** Cached for a couple of minutes; a stale value is served while it refreshes. */
export async function getInventorySummary(db, { fresh = false } = {}) {
  const age = summaryCache ? Date.now() - summaryCache.at : Infinity;
  if (!fresh && summaryCache && age < SUMMARY_TTL_MS) return summaryCache.value;
  if (!summaryInFlight) {
    summaryInFlight = computeSummary(db)
      .then((value) => {
        summaryCache = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        summaryInFlight = null;
      });
  }
  if (summaryCache && !fresh) {
    summaryInFlight.catch(() => {});
    return summaryCache.value;
  }
  return summaryInFlight;
}

export function invalidateInventorySummary() {
  if (summaryCache) summaryCache.at = 0;
}

/** Small dashboard lists — each is a single indexed/limited query. */
export async function getDashboardProductLists(db) {
  const columns = await listColumns(db);
  const [attention, recent] = await Promise.all([
    db
      .from("products")
      .select(columns)
      .or("in_stock.eq.false,stock_quantity.lte.10")
      .order("stock_quantity", { ascending: true })
      .order("id", { ascending: true })
      .limit(8),
    db
      .from("products")
      .select(columns)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(6),
  ]);
  return {
    attention: attention.error ? [] : (attention.data ?? []).map(toListProduct),
    recent: recent.error ? [] : (recent.data ?? []).map(toListProduct),
  };
}

/** One image per category, for banner fallbacks — only for categories that need it. */
export async function getCategoryPreviewImages(db, categoryIds) {
  const out = {};
  await Promise.all(
    categoryIds.slice(0, 60).map(async (id) => {
      const { data } = await db
        .from("products")
        .select("image")
        .in("category", categoryMatchAliases(id))
        .not("image", "is", null)
        .limit(1);
      if (data?.[0]?.image) out[id] = data[0].image;
    })
  );
  return out;
}

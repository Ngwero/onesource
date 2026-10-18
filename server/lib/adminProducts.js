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

const PRODUCT_COUNT_TTL_MS = 5 * 60 * 1000;
let productCountCache = null;
let productCountInFlight = null;

/** Exact catalogue count shared by admin stats, products, and inventory requests. */
export async function getExactProductCount(db, { fresh = false } = {}) {
  if (!fresh && productCountCache && Date.now() - productCountCache.at < PRODUCT_COUNT_TTL_MS) {
    return productCountCache.value;
  }
  if (!productCountInFlight) {
    productCountInFlight = (async () => {
      const { count, error } = await db
        .from("products")
        .select("id", { count: "exact", head: true });
      if (error) {
        if (productCountCache) return productCountCache.value;
        throw error;
      }
      const value = Number(count ?? 0);
      productCountCache = { at: Date.now(), value };
      return value;
    })()
      .finally(() => {
        productCountInFlight = null;
      });
  }
  return productCountInFlight;
}

/** Return immediately from cache, otherwise use Postgres' fast planner estimate. */
export async function getFastProductCount(db) {
  if (productCountCache && Date.now() - productCountCache.at < PRODUCT_COUNT_TTL_MS) {
    return { value: productCountCache.value, exact: true };
  }
  const { count, error } = await db
    .from("products")
    .select("id", { count: "planned", head: true });
  if (error) {
    if (productCountCache) return { value: productCountCache.value, exact: true };
    throw error;
  }
  return { value: Number(count ?? 0), exact: false };
}

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
  // The primary key is guaranteed to be indexed. Defaulting to updated_at made
  // a cold admin page wait for a full-table sort on databases where the optional
  // performance indexes have not been installed yet.
  const sortKey = SORT_COLUMNS[query.sort] ? String(query.sort) : "id";
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
  const sorted = query.order(column, { ascending: params.dir === "asc", nullsFirst: false });
  // Ordering the primary key both descending and ascending forces an unnecessary
  // sort and can exceed the statement timeout on the full catalogue.
  return column === "id" ? sorted : sorted.order("id", { ascending: true });
}

export async function listAdminProducts(db, params) {
  const columns = await listColumns(db);
  const supplierMatches = new Map();
  for (const token of searchTokens(params.q)) {
    supplierMatches.set(token, await supplierIdsMatching(db, token));
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  const run = (count, sortParams = params) =>
    applyAdminSort(
      applyAdminFilters(db.from("products").select("id", { count }), params, supplierMatches),
      sortParams
    ).range(from, to);

  const hasFilters = Boolean(
    params.ids.length || params.q || params.category || params.supplier || params.stock || params.prime || params.sale
  );
  const fastTotalPromise = hasFilters ? null : getFastProductCount(db);

  // The common Products and Inventory views sort by the indexed text primary
  // key. Fetch their slim card rows directly. The previous ID query followed by
  // `WHERE id IN (...)` forced a second planner pass and regularly exhausted the
  // statement timeout on the production catalogue.
  if (params.sortKey === "id") {
    const direct = await applyAdminSort(
      applyAdminFilters(db.from("products").select(columns), params, supplierMatches),
      params
    ).range(from, to);
    if (direct.error) throw direct.error;
    let products = (direct.data ?? []).map(toListProduct);
    if (params.sale) {
      products = products.filter((p) => p.originalPrice != null && p.originalPrice > p.price);
    }
    const fastTotal = fastTotalPromise ? await fastTotalPromise : null;
    return {
      products,
      total: hasFilters ? from + products.length + (products.length === params.pageSize ? 1 : 0) : fastTotal.value,
      totalExact: !hasFilters && fastTotal.exact,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  // Unfiltered admin views share one exact count. Filtered lists keep their count
  // attached to the query, falling back to the planner if Postgres reaches its limit.
  // Attach the rejection handler immediately: the page query may fail before the
  // count finishes, and Node treats a temporarily unobserved rejection as fatal.
  let countMode = hasFilters ? "exact" : null;
  let result = await run(countMode);
  if (result.error && isStatementTimeout(result.error) && params.sortKey !== "id") {
    // updated_at is not indexed on older deployments. The primary key always is,
    // so the portal still opens instead of waiting for the same doomed query twice.
    const fallbackSort = { ...params, sortKey: "id" };
    countMode = hasFilters ? "planned" : null;
    result = await run(countMode, fallbackSort);
  }
  if (result.error) throw result.error;

  const pageIds = (result.data ?? []).map((row) => row.id);
  let pageRows = [];
  if (pageIds.length) {
    const rowsResult = await db.from("products").select(columns).in("id", pageIds);
    if (rowsResult.error) throw rowsResult.error;
    const byId = new Map((rowsResult.data ?? []).map((row) => [row.id, row]));
    pageRows = pageIds.map((id) => byId.get(id)).filter(Boolean);
  }
  let products = pageRows.map(toListProduct);
  if (params.sale) {
    products = products.filter((p) => p.originalPrice != null && p.originalPrice > p.price);
  }
  const fastTotal = fastTotalPromise ? await fastTotalPromise : null;
  return {
    products,
    total: hasFilters ? result.count ?? from + products.length : fastTotal.value,
    totalExact: hasFilters ? countMode === "exact" : fastTotal.exact,
    page: params.page,
    pageSize: params.pageSize,
  };
}

const SUMMARY_TTL_MS = 2 * 60 * 1000;
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

/** Lightweight fallback when the optional aggregate RPC has not been installed. */
async function summaryFromCounts(db) {
  const total = await getFastProductCount(db);
  return {
    ...emptySummary(),
    total: total.value,
    totalExact: total.exact,
    // Detailed inventory aggregates require the optional admin_product_stats RPC.
    // Keep the fallback fast and exact for the catalogue total.
    live: total.value,
    healthy: total.value,
  };
}

async function computeSummary(db) {
  const startedAt = Date.now();
  const summary = (await summaryFromRpc(db)) ?? (await summaryFromCounts(db));
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
  productCountCache = null;
}

/** Small dashboard lists — each is a single indexed/limited query. */
export async function getDashboardProductLists(db) {
  const columns = await listColumns(db);
  const [attention, recent] = await Promise.all([
    db
      .from("products")
      .select(columns)
      .lte("stock_quantity", 10)
      // stock_quantity is not indexed on older databases. Primary-key order
      // finds a small attention sample quickly without sorting the catalogue.
      .order("id", { ascending: false })
      .limit(8),
    db
      .from("products")
      .select(columns)
      .order("id", { ascending: false })
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

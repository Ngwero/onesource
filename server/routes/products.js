import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireSupabase } from "../lib/supabase.js";
import {
  rowToProduct,
  parseBody,
  validateProduct,
  normalizeCategoryId,
} from "../db.js";
import { listCategories } from "../lib/categoriesService.js";
import { categoryMatchAliases } from "../data/categories.js";
import { withLocalProductFallback } from "../lib/localSeed.js";
import { enrichProductsWithSuppliers } from "../lib/suppliersService.js";
import { nestedAislePrefixes, productIdWithoutAisle } from "../lib/aisles.js";
import { productMatchesSearch, rankSearchResults, buildSearchOrFilter } from "../lib/productSearchMatch.js";
import { hasPublishedColumn } from "../lib/productColumns.js";
import { dbErrorMessage, isStatementTimeoutError } from "../lib/supabaseErrors.js";

const router = Router();

const SORTS = new Set(["newest", "top", "price-asc", "price-desc", "name"]);

function isTruthyParam(value) {
  return value === "1" || value === "true";
}

function listParams(query) {
  const sortRaw = String(query.sort ?? "").trim().toLowerCase();
  const prefixes = []
    .concat(query.titlePrefix ?? [])
    .map((p) => String(p).trim())
    .filter(Boolean)
    .slice(0, 20);
  return {
    sale: isTruthyParam(query.sale),
    prime: isTruthyParam(query.prime),
    sort: SORTS.has(sortRaw) ? sortRaw : "newest",
    titlePrefixes: prefixes,
  };
}

function quotePostgrestValue(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Title starts with `prefix` as a whole word (e.g. brand names). */
function titlePrefixOrFilter(prefixes) {
  return prefixes
    .flatMap((prefix) => {
      const esc = prefix.replace(/[%_]/g, "");
      if (!esc) return [];
      return [
        `title.ilike.${quotePostgrestValue(esc)}`,
        `title.ilike.${quotePostgrestValue(`${esc} %`)}`,
        `title.ilike.${quotePostgrestValue(`${esc}:%`)}`,
        `title.ilike.${quotePostgrestValue(`${esc}-%`)}`,
      ];
    })
    .join(",");
}

function applySort(query, sort) {
  switch (sort) {
    case "price-asc":
      return query.order("price", { ascending: true }).order("id", { ascending: true });
    case "price-desc":
      return query.order("price", { ascending: false }).order("id", { ascending: true });
    case "name":
      return query.order("title", { ascending: true }).order("id", { ascending: true });
    case "top":
      return query
        .order("review_count", { ascending: false, nullsFirst: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .order("id", { ascending: true });
    case "newest":
    default:
      return query.order("created_at", { ascending: false }).order("id", { ascending: true });
  }
}

function isOnSale(p) {
  return p.originalPrice != null && p.originalPrice > p.price;
}

function startsWithWord(title, prefix) {
  const t = String(title ?? "").toLowerCase();
  const p = prefix.toLowerCase();
  if (!t.startsWith(p)) return false;
  const next = t.charAt(p.length);
  return !next || !/[a-z0-9]/i.test(next);
}

/** Row-level checks PostgREST can't express (column-to-column comparisons). */
function matchesListParams(p, params) {
  if (params.sale && !isOnSale(p)) return false;
  if (params.prime && !p.prime) return false;
  if (params.titlePrefixes.length && !params.titlePrefixes.some((pre) => startsWithWord(p.title, pre))) {
    return false;
  }
  return true;
}

function parseListRequest(reqQuery) {
  const category = reqQuery.category;
  const shopRaw = String(reqQuery.shop ?? "").trim().toLowerCase();
  const aisleRaw = String(reqQuery.aisle ?? "").trim().toLowerCase();
  const aisleId = aisleRaw.replace(/[^a-z0-9-]/g, "");
  const categoryId = category ? String(category) : "";
  const cosmeticsOnly = shopRaw === "cosmetics" || categoryId === "cosmetics";
  const kitchenOnly =
    !cosmeticsOnly &&
    (shopRaw === "kitchen" ||
      Boolean(aisleId) ||
      categoryId === "kitchen-ware" ||
      categoryId === "kitchen-furniture");
  const freshOnly =
    !cosmeticsOnly &&
    !kitchenOnly &&
    (reqQuery.excludeKitchen === "1" ||
      reqQuery.excludeKitchen === "true" ||
      shopRaw === "fresh" ||
      shopRaw === "produce");
  return {
    admin: reqQuery.admin === "true",
    category,
    supplierId: reqQuery.supplierId ?? reqQuery.supplier_id,
    search: reqQuery.q?.trim(),
    aisleId,
    cosmeticsOnly,
    kitchenOnly,
    freshOnly,
    shopPrefix: cosmeticsOnly ? "cosmetics" : "kitchen",
    // Local dev only: show hidden cosmetics before they go live.
    previewCosmetics: cosmeticsOnly && process.env.PREVIEW_COSMETICS === "1",
    list: listParams(reqQuery),
  };
}

/** Sync on purpose: Supabase builders are thenable, so an async helper would run the query. */
function applyListFilters(query, ctx, { publishedColumn }) {
  const { list } = ctx;
  if (list.sale) {
    query = query.not("original_price", "is", null);
  }
  if (list.prime) {
    query = query.eq("prime", true);
  }
  if (list.titlePrefixes.length) {
    const prefixFilter = titlePrefixOrFilter(list.titlePrefixes);
    if (prefixFilter) query = query.or(prefixFilter);
  }
  if (!ctx.admin && !ctx.previewCosmetics) {
    query = query.eq("in_stock", true).gt("stock_quantity", 0);
    if (publishedColumn) query = query.eq("published", true);
  }
  if (ctx.category) {
    query = query.in("category", categoryMatchAliases(ctx.category));
  }
  if (ctx.supplierId) {
    query = query.eq("supplier_id", ctx.supplierId);
  }
  // Keep the Fresh, Kitchen and Cosmetics catalogues from drowning each other out.
  if (ctx.freshOnly) {
    query = query
      .not("id", "like", "kitchen-%")
      .not("id", "like", "cosmetics-%")
      .not("category", "in", "(kitchen-ware,cosmetics)");
  } else if (ctx.aisleId) {
    query = query.like("id", `${ctx.shopPrefix}-${ctx.aisleId}-%`);
    for (const nested of nestedAislePrefixes(ctx.shopPrefix, ctx.aisleId)) {
      query = query.not("id", "like", `${nested}%`);
    }
  } else if (ctx.cosmeticsOnly && !ctx.category) {
    query = query.or("id.like.cosmetics-%,category.eq.cosmetics");
  } else if (ctx.kitchenOnly && !ctx.category) {
    query = query.like("id", "kitchen-%");
  }
  if (ctx.search) {
    const orFilter = buildSearchOrFilter(ctx.search);
    if (orFilter) query = query.or(orFilter);
  }
  return query;
}

/** Columns a product card needs; `details` is reduced to the one key cards read. */
const CARD_COLUMNS = [
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
];

function cardSelect(publishedColumn) {
  return publishedColumn
    ? [...CARD_COLUMNS, "published", "ratingSource:details->>ratingSource"].join(",")
    : CARD_COLUMNS.join(",");
}

function cardRowToProduct(row) {
  const { ratingSource, ...rest } = row;
  const product = rowToProduct(rest);
  product.description = "";
  product.details = ratingSource ? { ratingSource } : {};
  return product;
}

/**
 * Small in-memory cache with stale-while-revalidate: past `freshMs` the old value is
 * served while one refresh runs, until `staleMs` after that. Concurrent misses share a load.
 */
function createSwrCache({ freshMs, staleMs, max }) {
  const entries = new Map();

  function refresh(key, entry, load) {
    entry.pending = Promise.resolve()
      .then(load)
      .then((value) => {
        if (value?.source !== "local-seed") {
          entry.value = value;
          entry.freshUntil = Date.now() + freshMs;
        } else if (entries.get(key) === entry && entry.value === undefined) {
          entries.delete(key);
        }
        return value;
      })
      .catch((error) => {
        if (entries.get(key) === entry && entry.value === undefined) entries.delete(key);
        throw error;
      })
      .finally(() => {
        entry.pending = undefined;
      });
    return entry.pending;
  }

  return {
    get(key, load) {
      const now = Date.now();
      let entry = entries.get(key);
      if (entry?.value !== undefined && entry.freshUntil + staleMs < now) entry = undefined;
      if (entry) {
        if (entry.value !== undefined) {
          if (entry.freshUntil <= now && !entry.pending) refresh(key, entry, load).catch(() => {});
          return Promise.resolve(entry.value);
        }
        if (entry.pending) return entry.pending;
      }
      entry = { value: undefined, freshUntil: 0, pending: undefined };
      entries.delete(key);
      if (entries.size >= max) entries.delete(entries.keys().next().value);
      entries.set(key, entry);
      return refresh(key, entry, load);
    },
    clear() {
      entries.clear();
    },
  };
}

/** Exact match counts per filter set; counting ~25k rows on every page was the slow part. */
const countCache = createSwrCache({ freshMs: 5 * 60 * 1000, staleMs: 30 * 60 * 1000, max: 300 });
/** Whole list pages for shoppers (never admin/search), so feed pages are served from memory. */
const listPageCache = createSwrCache({ freshMs: 30 * 1000, staleMs: 2 * 60 * 1000, max: 400 });

function forgetListings() {
  countCache.clear();
  listPageCache.clear();
}

function listingCount(db, ctx, publishedColumn) {
  return countCache.get(listFilterKey(ctx), async () => {
    const { count, error } = await applyListFilters(
      db.from("products").select("id", { count: "exact", head: true }),
      ctx,
      { publishedColumn }
    );
    if (error) throw error;
    return count ?? 0;
  });
}

function fallbackOptions(ctx, extra = {}) {
  return {
    admin: ctx.admin,
    category: ctx.category,
    search: ctx.search,
    aisle: ctx.aisleId || undefined,
    shop: ctx.freshOnly
      ? "fresh"
      : ctx.cosmeticsOnly
        ? "cosmetics"
        : ctx.kitchenOnly
          ? "kitchen"
          : undefined,
    ...ctx.list,
    ...extra,
  };
}

/** PostgREST returns at most this many rows per request (Supabase default `max-rows`). */
const MAX_ROWS = 1000;

async function loadListPage(ctx, { page, pageSize, card }) {
  const { admin, search, list } = ctx;
  return withLocalProductFallback(
    async () => {
      const db = requireSupabase();
      const publishedColumn = await hasPublishedColumn(db);

      if (search) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const query = applyListFilters(
          applySort(db.from("products").select("*", { count: "exact" }), list.sort),
          ctx,
          { publishedColumn }
        ).range(from, to);

        const { data: rows, error, count } = await query;
        if (error) throw error;

        let products = (rows ?? [])
          .map(rowToProduct)
          .filter((p) => productMatchesSearch(p, search) && matchesListParams(p, list));
        if (list.sort === "newest") products = rankSearchResults(products, search);

        return {
          products: await enrichProductsWithSuppliers(db, products, { admin }),
          total: count ?? products.length,
          hasMore: from + (rows ?? []).length < (count ?? 0),
        };
      }

      // One extra row tells us whether another page exists without counting every match.
      const from = page * pageSize;
      const pageQuery = applyListFilters(
        applySort(db.from("products").select(card ? cardSelect(publishedColumn) : "*"), list.sort),
        ctx,
        { publishedColumn }
      ).range(from, from + pageSize);

      const [{ data, error }, count] = await Promise.all([
        pageQuery,
        listingCount(db, ctx, publishedColumn).catch(() => null),
      ]);
      if (error) throw error;

      const rows = data ?? [];
      const pageRows = rows.slice(0, pageSize);
      const truncated = rows.length === MAX_ROWS && pageSize >= MAX_ROWS;
      const hasMore =
        rows.length > pageSize || (truncated && count != null && from + pageRows.length < count);
      const products = pageRows
        .map(card ? cardRowToProduct : rowToProduct)
        .filter((p) => matchesListParams(p, list));

      return {
        products: await enrichProductsWithSuppliers(db, products, { admin }),
        total: count ?? from + pageRows.length + (hasMore ? 1 : 0),
        hasMore,
      };
    },
    fallbackOptions(ctx, { page, pageSize })
  );
}

async function loadListOnceOrRetry(load) {
  try {
    return await load();
  } catch (error) {
    if (!isStatementTimeoutError(error)) throw error;
    return load();
  }
}

router.get("/", async (req, res) => {
  try {
    const ctx = parseListRequest(req.query);
    const { admin, search, previewCosmetics } = ctx;
    const page = Math.max(0, parseInt(req.query.page ?? "0", 10) || 0);
    const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize ?? "1000", 10) || 1000));
    // `fields=card` (web listings) drops descriptions and the full details JSON.
    const card = String(req.query.fields ?? "").toLowerCase() === "card";
    const shopperList = !admin && !search && !previewCosmetics;

    // Supabase cancels a cold statement (often around 8s). The same query is
    // usually fast immediately after, so one retry stays on this request
    // instead of answering 500 while the shop loader is still waiting.
    const load = () =>
      loadListOnceOrRetry(() => loadListPage(ctx, { page, pageSize, card }));
    const result = shopperList
      ? await listPageCache.get(
          JSON.stringify([listFilterKey(ctx), ctx.list.sort, page, pageSize, card]),
          load
        )
      : await load();

    if (shopperList && result.source !== "local-seed") {
      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    }
    res.json({
      products: previewCosmetics
        ? result.products.map((p) => ({ ...p, inStock: true }))
        : result.products,
      total: result.total,
      hasMore: Boolean(result.hasMore),
      ...(result.source === "local-seed" ? { source: "local-seed" } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

async function withoutMissingColumns(db, data) {
  if (await hasPublishedColumn(db)) return data;
  const { details: _details, published: _published, ...rest } = data;
  return rest;
}

router.get("/categories", async (_req, res) => {
  try {
    const db = requireSupabase();
    const categories = await listCategories(db, { admin: false });
    res.json({ categories });
  } catch (e) {
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

const TITLES_BATCH = 1000;
const TITLES_MAX_ROWS = 30000;
const TITLES_CONCURRENCY = 6;
const TITLES_CACHE_TTL_MS = 10 * 60 * 1000;
/** Past the TTL, keep serving the old list (while one refresh runs) for up to this long. */
const TITLES_CACHE_STALE_MS = 60 * 60 * 1000;
const TITLES_CACHE_MAX = 200;
/** key -> { titles?, freshUntil, pending? } — concurrent requests share one in-flight load. */
const titlesCache = new Map();

/** Identifies a filter set (not its sort or page) — shared by the titles, count and page caches. */
function listFilterKey(ctx) {
  return JSON.stringify([
    ctx.admin,
    ctx.previewCosmetics,
    ctx.cosmeticsOnly,
    ctx.kitchenOnly,
    ctx.freshOnly,
    ctx.aisleId,
    ctx.category ? String(ctx.category) : "",
    ctx.supplierId ? String(ctx.supplierId) : "",
    ctx.search ?? "",
    ctx.list.sale,
    ctx.list.prime,
    ctx.list.titlePrefixes,
  ]);
}

async function loadListingTitles(ctx) {
  return withLocalProductFallback(
    async () => {
      const db = requireSupabase();
      const publishedColumn = await hasPublishedColumn(db);
      const { sale, prime } = ctx.list;
      const columns = ["id", "title", ...(sale ? ["price", "original_price"] : []), ...(prime ? ["prime"] : [])];

      const fetchBatch = async (from, withCount = false) => {
        const query = applyListFilters(
          db
            .from("products")
            .select(columns.join(","), withCount ? { count: "exact" } : undefined)
            .order("id", { ascending: true }),
          ctx,
          { publishedColumn }
        );
        const { data, error, count } = await query.range(from, from + TITLES_BATCH - 1);
        if (error) throw error;
        return { rows: data ?? [], count };
      };

      const first = await fetchBatch(0, true);
      const total = Math.min(first.count ?? first.rows.length, TITLES_MAX_ROWS);
      const offsets = [];
      if (first.rows.length === TITLES_BATCH) {
        for (let from = TITLES_BATCH; from < total; from += TITLES_BATCH) offsets.push(from);
      }
      // Batches stay in id order regardless of which worker finishes first.
      const batches = [first.rows, ...offsets.map(() => [])];
      let next = 0;
      const worker = async () => {
        while (next < offsets.length) {
          const i = next++;
          batches[i + 1] = (await fetchBatch(offsets[i])).rows;
        }
      };
      await Promise.all(Array.from({ length: Math.min(TITLES_CONCURRENCY, offsets.length) }, worker));

      const titles = [];
      for (const row of batches.flat()) {
        const p = {
          title: row.title,
          price: Number(row.price),
          originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
          prime: Boolean(row.prime),
        };
        if (matchesListParams(p, ctx.list)) titles.push(row.title);
      }
      return { products: titles };
    },
    fallbackOptions(ctx, { page: 0, pageSize: TITLES_MAX_ROWS })
  );
}

function refreshListingTitles(key, ctx, entry) {
  entry.pending = loadListingTitles(ctx)
    .then((result) => {
      const titles = result.products.map((p) => (typeof p === "string" ? p : p.title));
      // Don't pin seed-data fallbacks once Supabase is reachable again.
      if (result.source !== "local-seed") {
        entry.titles = titles;
        entry.freshUntil = Date.now() + TITLES_CACHE_TTL_MS;
      } else if (!entry.titles && titlesCache.get(key) === entry) {
        titlesCache.delete(key);
      }
      return titles;
    })
    .catch((error) => {
      if (!entry.titles && titlesCache.get(key) === entry) titlesCache.delete(key);
      throw error;
    })
    .finally(() => {
      entry.pending = undefined;
    });
  return entry.pending;
}

function cachedListingTitles(ctx) {
  const key = listFilterKey(ctx);
  const now = Date.now();
  let entry = titlesCache.get(key);
  if (entry?.titles && entry.freshUntil + TITLES_CACHE_STALE_MS < now) entry = undefined;

  if (entry) {
    if (entry.titles && entry.freshUntil > now) return Promise.resolve(entry.titles);
    if (entry.titles) {
      if (!entry.pending) refreshListingTitles(key, ctx, entry).catch(() => {});
      return Promise.resolve(entry.titles);
    }
    if (entry.pending) return entry.pending;
  }

  entry = { titles: undefined, freshUntil: 0, pending: undefined };
  titlesCache.delete(key);
  if (titlesCache.size >= TITLES_CACHE_MAX) {
    titlesCache.delete(titlesCache.keys().next().value);
  }
  titlesCache.set(key, entry);
  return refreshListingTitles(key, ctx, entry);
}

/** Titles of every product matching the listing filters — for client-side facets (e.g. brands). */
router.get("/titles", async (req, res) => {
  try {
    const ctx = parseListRequest(req.query);
    const titles = await cachedListingTitles(ctx);
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json({ titles, total: titles.length });
  } catch (e) {
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

/**
 * Cosmetics ids embed the aisle; when a product moves aisle (e.g. hair-baby-more →
 * fragrance) old links, carts and lists still carry the old id. Look up the same
 * source id (`lf-123`, `boots-456`) in any cosmetics aisle.
 */
async function findMovedCosmeticsProduct(db, id) {
  if (!id.startsWith("cosmetics-")) return null;
  const sourceId = productIdWithoutAisle("cosmetics", id);
  if (sourceId === id || !/^[a-z]+-[\w-]+$/i.test(sourceId)) return null;
  const { data, error } = await db.from("products").select("*").like("id", `cosmetics-%-${sourceId}`).limit(5);
  if (error) throw error;
  return (data ?? []).find((r) => productIdWithoutAisle("cosmetics", r.id) === sourceId) ?? null;
}

router.get("/:id", async (req, res) => {
  try {
    const result = await withLocalProductFallback(
      async () => {
        const db = requireSupabase();
        const { data: found, error } = await db
          .from("products")
          .select("*")
          .eq("id", req.params.id)
          .maybeSingle();

        if (error) throw error;
        const row = found ?? (await findMovedCosmeticsProduct(db, req.params.id));
        if (!row || (row.published === false && req.query.admin !== "true")) {
          const err = new Error("Product not found");
          err.status = 404;
          throw err;
        }
        return {
          product: (
            await enrichProductsWithSuppliers(db, [rowToProduct(row)], { admin: false })
          )[0],
        };
      },
      { productId: req.params.id }
    );

    res.json({ product: result.product });
  } catch (e) {
    const status = e.status === 404 ? 404 : 500;
    res.status(status).json({ error: dbErrorMessage(e) });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const data = await withoutMissingColumns(db, parseBody(req.body));
    data.id = data.id || uuidv4();

    const errors = validateProduct(data);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const { data: existing } = await db
      .from("products")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "Product id already exists" });
    }

    const { data: row, error } = await db
      .from("products")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    forgetListings();
    res.status(201).json({ product: rowToProduct(row), message: "Product created" });
  } catch (e) {
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const { data: existing, error: fetchErr } = await db
      .from("products")
      .select("id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: "Product not found" });

    const data = await withoutMissingColumns(db, parseBody(req.body, { id: req.params.id }));
    const errors = validateProduct(data, true);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const { data: row, error } = await db
      .from("products")
      .update(data)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    forgetListings();
    res.json({ product: rowToProduct(row), message: "Product updated" });
  } catch (e) {
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

router.patch("/:id/stock", async (req, res) => {
  try {
    const db = requireSupabase();
    const { data: existing, error: fetchErr } = await db
      .from("products")
      .select("id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: "Product not found" });

    const qty = Math.max(
      0,
      Math.floor(Number(req.body.stockQuantity ?? req.body.stock_quantity))
    );
    if (Number.isNaN(qty)) {
      return res.status(400).json({ error: "stockQuantity must be a number" });
    }

    const { data: row, error } = await db
      .from("products")
      .update({
        stock_quantity: qty,
        in_stock: qty > 0,
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    forgetListings();
    res.json({ product: rowToProduct(row), message: "Stock updated" });
  } catch (e) {
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const { data, error } = await db
      .from("products")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: "Product not found" });
    forgetListings();
    res.json({ message: "Product deleted" });
  } catch (e) {
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

export default router;

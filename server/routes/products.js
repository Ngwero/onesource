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
import { nestedAislePrefixes } from "../lib/aisles.js";
import { productMatchesSearch, rankSearchResults, buildSearchOrFilter } from "../lib/productSearchMatch.js";
import { hasPublishedColumn } from "../lib/productColumns.js";

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

router.get("/", async (req, res) => {
  try {
    const ctx = parseListRequest(req.query);
    const { admin, search, list, previewCosmetics } = ctx;
    const page = Math.max(0, parseInt(req.query.page ?? "0", 10) || 0);
    const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize ?? "1000", 10) || 1000));

    const result = await withLocalProductFallback(
      async () => {
        const db = requireSupabase();
        const publishedColumn = await hasPublishedColumn(db);
        let query = applyListFilters(
          applySort(db.from("products").select("*", { count: "exact" }), list.sort),
          ctx,
          { publishedColumn }
        );

        if (search) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          query = query.range(from, to);

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

        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data: rows, error, count } = await query;
        if (error) throw error;

        return {
          products: await enrichProductsWithSuppliers(
            db,
            (rows ?? []).map(rowToProduct).filter((p) => matchesListParams(p, list)),
            { admin }
          ),
          total: count ?? (rows ?? []).length,
          hasMore: from + (rows ?? []).length < (count ?? 0),
        };
      },
      fallbackOptions(ctx, { page, pageSize })
    );

    res.json({
      products: previewCosmetics
        ? result.products.map((p) => ({ ...p, inStock: true }))
        : result.products,
      total: result.total,
      hasMore: Boolean(result.hasMore),
      ...(result.source === "local-seed" ? { source: "local-seed" } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

/** Titles of every product matching the listing filters — for client-side facets (e.g. brands). */
router.get("/titles", async (req, res) => {
  try {
    const ctx = parseListRequest(req.query);
    const batch = 1000;
    const maxRows = 30000;
    const result = await withLocalProductFallback(
      async () => {
        const db = requireSupabase();
        const publishedColumn = await hasPublishedColumn(db);
        const titles = [];
        for (let from = 0; from < maxRows; from += batch) {
          const query = applyListFilters(
            db
              .from("products")
              .select("id,title,price,original_price,prime")
              .order("id", { ascending: true }),
            ctx,
            { publishedColumn }
          );
          const { data: rows, error } = await query.range(from, from + batch - 1);
          if (error) throw error;
          for (const row of rows ?? []) {
            const p = {
              title: row.title,
              price: Number(row.price),
              originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
              prime: Boolean(row.prime),
            };
            if (matchesListParams(p, ctx.list)) titles.push(row.title);
          }
          if ((rows ?? []).length < batch) break;
        }
        return { products: titles };
      },
      fallbackOptions(ctx, { page: 0, pageSize: maxRows })
    );
    const titles = result.products.map((p) => (typeof p === "string" ? p : p.title));
    res.set("Cache-Control", "public, max-age=300");
    res.json({ titles, total: titles.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await withLocalProductFallback(
      async () => {
        const db = requireSupabase();
        const { data: row, error } = await db
          .from("products")
          .select("*")
          .eq("id", req.params.id)
          .maybeSingle();

        if (error) throw error;
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
    res.status(status).json({ error: e.message });
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
    res.status(201).json({ product: rowToProduct(row), message: "Product created" });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.json({ product: rowToProduct(row), message: "Product updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.json({ product: rowToProduct(row), message: "Stock updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.json({ message: "Product deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

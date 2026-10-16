import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { listCategories } from "../lib/categoriesService.js";
import { listSuppliers } from "../lib/suppliersService.js";
import {
  getCategoryPreviewImages,
  getDashboardProductLists,
  getExactProductCount,
  getInventorySummary,
  isStatementTimeout,
  listAdminProducts,
  parseAdminListQuery,
} from "../lib/adminProducts.js";

const router = Router();

const TIMEOUT_MESSAGE =
  "The database took too long to answer — try again, or narrow your search/filters.";

function sendDbError(res, e, status = 500) {
  if (isStatementTimeout(e)) {
    return res.status(503).json({ ok: false, error: TIMEOUT_MESSAGE, code: "DB_TIMEOUT" });
  }
  res.status(status).json({ ok: false, error: e.message });
}

/** Paginated, slim product list for the admin tables (search/filter/sort run in the DB). */
router.get("/products", async (req, res) => {
  try {
    const db = requireSupabase();
    const result = await listAdminProducts(db, parseAdminListQuery(req.query));
    res.set("Cache-Control", "no-store").json(result);
  } catch (e) {
    sendDbError(res, e);
  }
});

// Kept separate from the page data: an exact COUNT(*) can take several seconds
// on a large catalogue, but it must never hold up the admin tables.
router.get("/product-count", async (_req, res) => {
  try {
    const count = await getExactProductCount(requireSupabase());
    res.set("Cache-Control", "no-store").json({ ok: true, products: count, exact: true });
  } catch (e) {
    sendDbError(res, e, 503);
  }
});

router.get("/stats", async (req, res) => {
  try {
    const db = requireSupabase();
    const fresh = req.query.fresh === "1";

    // Counting the full catalogue is the one expensive operation. Let it finish
    // before the smaller dashboard reads so they do not compete for the same
    // statement-timeout budget on a cold database.
    const summary = await getInventorySummary(db, { fresh });
    const [lists, orderCountRes, categories, suppliers] = await Promise.all([
      getDashboardProductLists(db).catch(() => ({ attention: [], recent: [] })),
      db.from("orders").select("id", { count: "planned", head: true }),
      listCategories(db, { admin: true }).catch(() => []),
      listSuppliers(db, { admin: true, withProductCounts: false }).catch(() => []),
    ]);
    const ordersErr = orderCountRes.error;
    if (ordersErr && !isMissingTable(ordersErr) && !isStatementTimeout(ordersErr)) throw ordersErr;

    let revenue = 0;
    let placedOrders = 0;
    if (!ordersErr) {
      const [{ data: orderRows }, { count: placed }] = await Promise.all([
        db.from("orders").select("total, status").neq("status", "cancelled"),
        db.from("orders").select("id", { count: "exact", head: true }).eq("status", "placed"),
      ]);
      for (const o of orderRows ?? []) revenue += Number(o.total ?? 0);
      placedOrders = placed ?? 0;
    }

    const needPreview = categories
      .filter((c) => c.active !== false && !String(c.image ?? "").trim())
      .map((c) => c.id);
    const categoryPreviews = await getCategoryPreviewImages(db, needPreview).catch(() => ({}));

    res.set("Cache-Control", "no-store").json({
      ok: true,
      products: summary.total,
      productsExact: summary.totalExact !== false,
      orders: orderCountRes.count ?? 0,
      categories: categories.filter((c) => c.active !== false).length,
      suppliers: suppliers.length,
      suppliersApproved: suppliers.filter((s) => s.status === "approved").length,
      suppliersPending: suppliers.filter((s) => s.status === "pending").length,
      inventory: {
        live: summary.live,
        out: summary.out,
        low: summary.low,
        healthy: summary.healthy,
        units: summary.units,
        stockValue: summary.stockValue,
        computedAt: summary.computedAt,
      },
      categoryCounts: summary.byCategory,
      categoryPreviews,
      attention: lists.attention,
      recentProducts: lists.recent,
      ordersSummary: { revenue, placed: placedOrders },
      database: "supabase",
    });
  } catch (e) {
    sendDbError(res, e, 503);
  }
});

function isMissingTable(error) {
  const msg = (error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export default router;

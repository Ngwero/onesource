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

// ─── Flagged admin surfaces (admin panel has weak/no separate auth UX —
// require ADMIN_USER_IDS / app_metadata role; keep these behind FEATURE_*). ───

import { isFeatureEnabled } from "../lib/featureFlags.js";
import * as returnsService from "../lib/returnsService.js";
import * as supportChat from "../lib/supportChatService.js";
import * as sellersService from "../lib/sellersService.js";
import { requireSupabase as requireDb } from "../lib/supabase.js";

/** ADMIN SURFACE: list return requests (FEATURE_RETURNS). */
router.get("/returns", async (req, res) => {
  if (!isFeatureEnabled("returns")) {
    return res.status(404).json({ error: "Returns are not enabled" });
  }
  try {
    const result = await returnsService.listReturnsAdmin(requireDb(), {
      limit: Number(req.query.limit) || 50,
    });
    if (result.missing) {
      return res.status(503).json({
        error: returnsService.RETURNS_SETUP_HINT,
        code: "MISSING_TABLE",
        adminSurface: true,
      });
    }
    res.set("Cache-Control", "no-store").json({
      returns: result.returns,
      adminSurface: true,
    });
  } catch (e) {
    sendDbError(res, e);
  }
});

/** ADMIN SURFACE: update return status — no payment refund. */
router.patch("/returns/:id", async (req, res) => {
  if (!isFeatureEnabled("returns")) {
    return res.status(404).json({ error: "Returns are not enabled" });
  }
  try {
    const result = await returnsService.updateReturnStatus(
      requireDb(),
      req.params.id,
      String(req.body?.status || ""),
      { adminNote: req.body?.adminNote ?? req.body?.admin_note }
    );
    if (result.missing) {
      return res.status(503).json({
        error: returnsService.RETURNS_SETUP_HINT,
        code: "MISSING_TABLE",
      });
    }
    if (!result.returnRequest) return res.status(404).json({ error: "Return not found" });
    res.json({
      return: result.returnRequest,
      note: "Status only — no payment refund movement",
      adminSurface: true,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** ADMIN SURFACE: support threads (FEATURE_SUPPORT_CHAT / FEATURE_CHAT). */
router.get("/support/threads", async (req, res) => {
  if (!isFeatureEnabled("supportChat") && !isFeatureEnabled("chat")) {
    return res.status(404).json({ error: "Support chat is not enabled" });
  }
  try {
    const result = await supportChat.listThreadsAdmin(requireDb(), {
      limit: Number(req.query.limit) || 50,
    });
    if (result.missing) {
      return res.status(503).json({
        error: supportChat.SUPPORT_SETUP_HINT,
        code: "MISSING_TABLE",
        adminSurface: true,
      });
    }
    res.set("Cache-Control", "no-store").json({
      threads: result.threads,
      adminSurface: true,
    });
  } catch (e) {
    sendDbError(res, e);
  }
});

router.get("/support/threads/:id", async (req, res) => {
  if (!isFeatureEnabled("supportChat") && !isFeatureEnabled("chat")) {
    return res.status(404).json({ error: "Support chat is not enabled" });
  }
  try {
    const thread = await supportChat.getThreadAdmin(requireDb(), req.params.id);
    if (!thread) return res.status(404).json({ error: "Thread not found" });
    res.set("Cache-Control", "no-store").json({ thread, adminSurface: true });
  } catch (e) {
    sendDbError(res, e);
  }
});

router.post("/support/threads/:id/messages", async (req, res) => {
  if (!isFeatureEnabled("supportChat") && !isFeatureEnabled("chat")) {
    return res.status(404).json({ error: "Support chat is not enabled" });
  }
  try {
    const db = requireDb();
    const thread = await supportChat.getThreadAdmin(db, req.params.id);
    if (!thread) return res.status(404).json({ error: "Thread not found" });
    const result = await supportChat.addMessage(db, {
      threadId: thread.id,
      senderId: req.auth?.id,
      senderRole: "admin",
      body: req.body?.body,
    });
    if (result.missing) {
      return res.status(503).json({
        error: supportChat.SUPPORT_SETUP_HINT,
        code: "MISSING_TABLE",
      });
    }
    res.status(201).json({ message: result.message, adminSurface: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** ADMIN SURFACE: create timed deal (FEATURE_TIMED_DEALS / FEATURE_DEALS). */
router.post("/deals", async (req, res) => {
  if (!isFeatureEnabled("timedDeals") && !isFeatureEnabled("deals")) {
    return res.status(404).json({ error: "Timed deals are not enabled" });
  }
  try {
    const db = requireDb();
    const row = {
      product_id: String(req.body?.productId ?? req.body?.product_id ?? "").trim(),
      price_minor: Math.floor(Number(req.body?.priceMinor ?? req.body?.price_minor)),
      starts_at: req.body?.startsAt ?? req.body?.starts_at,
      ends_at: req.body?.endsAt ?? req.body?.ends_at,
      title: req.body?.title ? String(req.body.title).slice(0, 200) : null,
      member_only: Boolean(req.body?.memberOnly ?? req.body?.member_only),
    };
    if (!row.product_id || !Number.isFinite(row.price_minor) || !row.starts_at || !row.ends_at) {
      return res.status(400).json({ error: "productId, priceMinor, startsAt, endsAt required" });
    }
    const { data, error } = await db.from("deals").insert(row).select("*").single();
    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({ error: "deals table not installed", code: "MISSING_TABLE" });
      }
      throw error;
    }
    res.status(201).json({ deal: data, adminSurface: true });
  } catch (e) {
    sendDbError(res, e);
  }
});

/** ADMIN SURFACE: create seller (FEATURE_MARKETPLACE). */
router.post("/sellers", async (req, res) => {
  if (!isFeatureEnabled("marketplace")) {
    return res.status(404).json({ error: "Marketplace is not enabled" });
  }
  try {
    const seller = await sellersService.createSeller(requireDb(), {
      name: req.body?.name,
      slug: req.body?.slug,
      bio: req.body?.bio,
      commissionRate: req.body?.commissionRate ?? req.body?.commission_rate,
    });
    res.status(201).json({ seller, adminSurface: true });
  } catch (e) {
    if (e.code === "MISSING_TABLE") {
      return res.status(503).json({ error: e.message, code: "MISSING_TABLE" });
    }
    res.status(400).json({ error: e.message });
  }
});

export default router;

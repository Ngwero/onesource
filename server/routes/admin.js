import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { listCategories } from "../lib/categoriesService.js";

const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const db = requireSupabase();

    const [
      { count: productCount, error: productsErr },
      { count: orderCount, error: ordersErr },
      { data: stockRows, error: stockErr },
    ] = await Promise.all([
      db.from("products").select("*", { count: "exact", head: true }),
      db.from("orders").select("*", { count: "exact", head: true }),
      db.from("products").select("stock_quantity, in_stock, price"),
    ]);

    if (productsErr) throw productsErr;
    if (ordersErr && !isMissingTable(ordersErr)) throw ordersErr;

    let categories = [];
    try {
      categories = await listCategories(db, { admin: true });
    } catch {
      categories = [];
    }

    const rows = stockRows ?? [];
    const live = rows.filter((r) => r.in_stock && (r.stock_quantity ?? 0) > 0).length;
    const out = rows.filter((r) => !r.in_stock || (r.stock_quantity ?? 0) <= 0).length;
    const low = rows.filter(
      (r) => (r.stock_quantity ?? 0) > 0 && (r.stock_quantity ?? 0) <= 10
    ).length;
    const units = rows.reduce((s, r) => s + (r.stock_quantity ?? 0), 0);
    const stockValue = rows.reduce(
      (s, r) => s + Number(r.price ?? 0) * (r.stock_quantity ?? 0),
      0
    );

    let revenue = 0;
    let placedOrders = 0;
    if (!ordersErr) {
      const { data: orderRows } = await db
        .from("orders")
        .select("total, status")
        .neq("status", "cancelled");
      for (const o of orderRows ?? []) {
        revenue += Number(o.total ?? 0);
      }
      const { count: placed } = await db
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "placed");
      placedOrders = placed ?? 0;
    }

    res.json({
      ok: true,
      products: productCount ?? rows.length,
      orders: orderCount ?? 0,
      categories: categories.filter((c) => c.active !== false).length,
      inventory: { live, out, low, units, stockValue },
      ordersSummary: { revenue, placed: placedOrders },
      database: "supabase",
    });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
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

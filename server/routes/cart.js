import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import { suggestCartUpsells } from "../lib/cartUpsellService.js";
import { rowToProduct } from "../db.js";

const router = Router();

router.get("/suggestions", async (req, res) => {
  if (!isFeatureEnabled("cartUpsell")) {
    return res.json({ productIds: [], products: [], enabled: false });
  }
  try {
    const raw = String(req.query.productIds || req.query.ids || "");
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
    const db = requireSupabase();
    let cartProducts = ids.map((id) => ({ id }));
    if (ids.length) {
      const { data } = await db.from("products").select("id, title, category").in("id", ids);
      cartProducts = data ?? cartProducts;
    }
    const rows = await suggestCartUpsells(db, cartProducts, {
      limit: Number(req.query.limit) || 8,
    });
    const products = rows.map((r) => rowToProduct(r));
    res.set("Cache-Control", "no-store").json({
      enabled: true,
      productIds: products.map((p) => p.id),
      products,
      source: "also-bought+aisle",
    });
  } catch (e) {
    console.error("[cart/suggestions]", e);
    res.status(500).json({ error: e.message });
  }
});

/** Alias for POST body shape used by cartUpsell router. */
router.post("/suggestions", async (req, res) => {
  if (!isFeatureEnabled("cartUpsell")) {
    return res.json({ products: [], disabled: true });
  }
  try {
    const bodyItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const productIds = bodyItems
      .map((i) => String(i.productId || i.id || "").trim())
      .filter(Boolean)
      .slice(0, 20);
    const db = requireSupabase();
    let cartProducts = bodyItems.map((i) => ({
      id: String(i.productId || i.id),
      title: i.title || "",
      category: i.category || "",
    }));
    if (productIds.length) {
      const { data } = await db
        .from("products")
        .select("id, title, category")
        .in("id", productIds);
      if (data?.length) cartProducts = data;
    }
    const rows = await suggestCartUpsells(db, cartProducts, {
      limit: Math.min(8, Number(req.body?.limit) || 6),
    });
    res.json({ products: rows.map((r) => rowToProduct(r)), enabled: true });
  } catch (e) {
    res.status(500).json({ error: e.message, products: [] });
  }
});

export default router;

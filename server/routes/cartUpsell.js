import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import { suggestCartUpsells } from "../lib/cartUpsellService.js";
import { rowToProduct } from "../db.js";

const router = Router();

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
    let cartProducts = bodyItems
      .filter((i) => i.title || i.category)
      .map((i) => ({
        id: String(i.productId || i.id),
        title: i.title || "",
        category: i.category || "",
      }));

    if (productIds.length && cartProducts.length < productIds.length) {
      const { data } = await db
        .from("products")
        .select("id, title, category")
        .in("id", productIds);
      cartProducts = data ?? [];
    }

    const rows = await suggestCartUpsells(db, cartProducts, {
      limit: Math.min(8, Number(req.body?.limit) || 6),
    });
    res.json({ products: rows.map((r) => rowToProduct(r)) });
  } catch (e) {
    res.status(500).json({ error: e.message, products: [] });
  }
});

export default router;

import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import {
  SUBSCRIPTIONS_SETUP_HINT,
  listSubscriptions,
  createSubscription,
  setSubscriptionActive,
} from "../lib/subscriptionsService.js";
import { rowToProduct } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  if (!isFeatureEnabled("subscriptions")) {
    return res.json({ subscriptions: [], disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const result = await listSubscriptions(requireSupabase(), req.auth.id);
    res.json({
      subscriptions: result.subscriptions,
      missing: result.missing,
      ...(result.missing ? { setupHint: SUBSCRIPTIONS_SETUP_HINT } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  if (!isFeatureEnabled("subscriptions")) {
    return res.status(404).json({ error: "Subscriptions are not enabled", disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  const productId = String(req.body?.productId || "").trim();
  if (!productId) return res.status(400).json({ error: "productId required" });
  try {
    const result = await createSubscription(requireSupabase(), {
      userId: req.auth.id,
      productId,
      quantity: req.body?.quantity,
      intervalDays: req.body?.intervalDays,
      sourceOrderId: req.body?.sourceOrderId,
    });
    if (result.missing) return res.status(503).json({ error: SUBSCRIPTIONS_SETUP_HINT, missing: true });
    res.status(201).json({
      subscription: result.subscription,
      note: "Reminders only — no automatic charges.",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/:id", async (req, res) => {
  if (!isFeatureEnabled("subscriptions")) {
    return res.status(404).json({ error: "Subscriptions are not enabled", disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const result = await setSubscriptionActive(
      requireSupabase(),
      req.auth.id,
      req.params.id,
      req.body?.active !== false
    );
    if (result.missing) return res.status(503).json({ error: SUBSCRIPTIONS_SETUP_HINT, missing: true });
    if (result.notFound) return res.status(404).json({ error: "Not found" });
    res.json({ subscription: result.subscription });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** One-tap reorder: return line items from a delivered order for the client cart. */
router.post("/reorder/:orderId", async (req, res) => {
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const db = requireSupabase();
    const { data: order, error } = await db
      .from("orders")
      .select("id, user_id, status, order_items(product_id, quantity, product_title, product_image, unit_price)")
      .eq("id", req.params.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order || order.user_id !== req.auth.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ error: "Reorder is available for delivered orders only" });
    }
    const ids = (order.order_items ?? []).map((i) => i.product_id).filter(Boolean);
    let products = [];
    if (ids.length) {
      const { data } = await db.from("products").select("*").in("id", ids).eq("published", true);
      const byId = new Map((data ?? []).map((r) => [r.id, rowToProduct(r)]));
      products = (order.order_items ?? [])
        .map((line) => {
          const p = byId.get(line.product_id);
          if (!p || !p.inStock) return null;
          return { product: p, quantity: line.quantity };
        })
        .filter(Boolean);
    }
    res.json({
      orderId: order.id,
      items: products,
      note: "Adds available items to a draft basket — no charge until checkout.",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

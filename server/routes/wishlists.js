import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import {
  WISHLISTS_SETUP_HINT,
  getUserWishlist,
  setWishlistItems,
  addWishlistItem,
  removeWishlistItem,
  enableWishlistShare,
  getSharedWishlist,
} from "../lib/wishlistsService.js";
import { rowToProduct } from "../db.js";

const router = Router();

function requireFlag(res) {
  if (!isFeatureEnabled("wishlists")) {
    res.status(404).json({ error: "Wishlists are not enabled", disabled: true });
    return false;
  }
  return true;
}

router.get("/", async (req, res) => {
  if (!requireFlag(res)) return;
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const result = await getUserWishlist(requireSupabase(), req.auth.id);
    if (result.missing) {
      return res.json({ items: [], productIds: [], setupHint: WISHLISTS_SETUP_HINT, missing: true });
    }
    res.json({
      wishlist: result.wishlist,
      productIds: result.items.map((i) => i.productId),
      items: result.items,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/", async (req, res) => {
  if (!requireFlag(res)) return;
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const ids = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
    const result = await setWishlistItems(requireSupabase(), req.auth.id, ids);
    if (result.missing) {
      return res.json({ ok: true, missing: true, setupHint: WISHLISTS_SETUP_HINT });
    }
    res.json({
      ok: true,
      wishlist: result.wishlist,
      productIds: result.items.map((i) => i.productId),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/items", async (req, res) => {
  if (!requireFlag(res)) return;
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  const productId = String(req.body?.productId || "").trim();
  if (!productId) return res.status(400).json({ error: "productId required" });
  try {
    const result = await addWishlistItem(requireSupabase(), req.auth.id, productId);
    if (result.missing) return res.json({ ok: true, missing: true });
    res.status(201).json({ ok: true, productIds: result.items.map((i) => i.productId) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/items/:productId", async (req, res) => {
  if (!requireFlag(res)) return;
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const result = await removeWishlistItem(requireSupabase(), req.auth.id, req.params.productId);
    if (result.missing) return res.json({ ok: true, missing: true });
    res.json({ ok: true, productIds: result.items.map((i) => i.productId) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/share", async (req, res) => {
  if (!requireFlag(res)) return;
  if (!isFeatureEnabled("wishlistsShare")) {
    return res.status(404).json({ error: "Wishlist sharing is not enabled", disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const result = await enableWishlistShare(requireSupabase(), req.auth.id);
    if (result.missing) return res.json({ ok: false, missing: true, setupHint: WISHLISTS_SETUP_HINT });
    res.json({
      ok: true,
      shareToken: result.shareToken,
      sharePath: `/lists/shared/${result.shareToken}`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/shared/:token", async (req, res) => {
  if (!requireFlag(res) || !isFeatureEnabled("wishlistsShare")) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const db = requireSupabase();
    const result = await getSharedWishlist(db, req.params.token);
    if (result.missing) return res.json({ items: [], products: [], missing: true });
    if (result.notFound) return res.status(404).json({ error: "Wishlist not found" });

    const ids = result.items.map((i) => i.productId);
    let products = [];
    if (ids.length) {
      const { data } = await db
        .from("products")
        .select("*")
        .in("id", ids)
        .eq("published", true);
      const byId = new Map((data ?? []).map((r) => [r.id, rowToProduct(r)]));
      products = ids.map((id) => byId.get(id)).filter(Boolean);
    }
    res.json({ name: result.name, productIds: ids, products });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

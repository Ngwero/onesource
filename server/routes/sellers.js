import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import * as sellers from "../lib/sellersService.js";

const router = Router();

function flagOff(res) {
  return res.status(404).json({ error: "Marketplace is not enabled" });
}

function handleErr(res, e) {
  if (e.code === "MISSING_TABLE") {
    return res.status(503).json({ error: e.message, code: "MISSING_TABLE" });
  }
  console.error("[sellers]", e);
  return res.status(500).json({ error: e.message || "Seller error" });
}

router.get("/", async (_req, res) => {
  if (!isFeatureEnabled("marketplace")) return flagOff(res);
  try {
    const list = await sellers.listSellers(requireSupabase());
    res.json({ sellers: list });
  } catch (e) {
    handleErr(res, e);
  }
});

router.get("/:slug", async (req, res) => {
  if (!isFeatureEnabled("marketplace")) return flagOff(res);
  try {
    const db = requireSupabase();
    const seller = await sellers.getSellerBySlug(db, req.params.slug);
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    const [rating, products] = await Promise.all([
      sellers.getSellerRatingAggregate(db, seller.id),
      sellers.listSellerProducts(db, seller.id),
    ]);
    res.json({
      seller: {
        ...seller,
        // Commission is internal — omit from public profile
        commission_rate: undefined,
      },
      rating,
      products,
      soldBy: "marketplace",
    });
  } catch (e) {
    handleErr(res, e);
  }
});

export default router;

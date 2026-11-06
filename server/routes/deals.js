import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import {
  DEALS_SETUP_HINT,
  listActiveDeals,
  listAllDealsAdmin,
  rowToDeal,
} from "../lib/dealsService.js";
import { asMoneyInteger } from "../lib/money.js";
import { tableExists } from "../lib/tableDetect.js";

const router = Router();

router.get("/active", async (req, res) => {
  if (!isFeatureEnabled("deals")) {
    return res.json({ deals: [], disabled: true, serverNow: new Date().toISOString() });
  }
  try {
    const db = requireSupabase();
    const includeMemberOnly = Boolean(req.auth?.id);
    const result = await listActiveDeals(db, { includeMemberOnly });
    res.set("Cache-Control", "no-store").json({
      deals: result.deals,
      serverNow: result.serverNow,
      missing: result.missing,
      ...(result.missing ? { setupHint: DEALS_SETUP_HINT } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e.message, serverNow: new Date().toISOString() });
  }
});

router.get("/server-time", (_req, res) => {
  const now = new Date();
  res.set("Cache-Control", "no-store").json({
    serverNow: now.toISOString(),
    unixMs: now.getTime(),
  });
});

/** Admin list — auth via /api/admin guard when mounted there; also available here if admin. */
router.get("/", async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Administrator access is required." });
  try {
    const result = await listAllDealsAdmin(requireSupabase());
    res.json({ ...result, ...(result.missing ? { setupHint: DEALS_SETUP_HINT } : {}) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Administrator access is required." });
  try {
    const db = requireSupabase();
    if (!(await tableExists(db, "deals"))) {
      return res.status(503).json({ error: DEALS_SETUP_HINT, missing: true });
    }
    const body = req.body ?? {};
    const dealPrice = asMoneyInteger(body.dealPrice ?? body.deal_price);
    if (!body.productId || dealPrice == null) {
      return res.status(400).json({ error: "productId and dealPrice required" });
    }
    const startsAt = new Date(body.startsAt ?? body.starts_at ?? Date.now()).toISOString();
    const endsAt = new Date(body.endsAt ?? body.ends_at ?? Date.now() + 86400000).toISOString();
    const { data, error } = await db
      .from("deals")
      .insert({
        product_id: String(body.productId),
        title: String(body.title || "Deal").slice(0, 200),
        deal_price: dealPrice,
        starts_at: startsAt,
        ends_at: endsAt,
        deal_of_day: Boolean(body.dealOfDay ?? body.deal_of_day),
        member_only: Boolean(body.memberOnly ?? body.member_only),
        active: body.active !== false,
      })
      .select("*")
      .single();
    if (error) throw error;
    res.status(201).json({ deal: rowToDeal(data) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

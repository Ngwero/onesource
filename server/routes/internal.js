import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { runSubscriptionTicks } from "../lib/subscriptionsService.js";
import { logInfo } from "../lib/requestLog.js";

const router = Router();

function authorizeCron(req, res) {
  const secret = process.env.INTERNAL_CRON_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ error: "INTERNAL_CRON_SECRET is not configured" });
    return false;
  }
  const provided =
    req.get("x-internal-cron-secret") ||
    req.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.body?.secret;
  if (provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/** Cron-friendly: advance due subscription reminders (no payments). */
router.post("/run-subscription-ticks", async (req, res) => {
  if (!authorizeCron(req, res)) return;
  try {
    const result = await runSubscriptionTicks(requireSupabase(), {
      limit: Math.min(100, Number(req.body?.limit) || 50),
    });
    logInfo("cron", "subscription ticks", { reminded: result.reminded, missing: result.missing });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

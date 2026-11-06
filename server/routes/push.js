import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import {
  PUSH_SETUP_HINT,
  upsertPushToken,
  listUserInbox,
} from "../lib/pushNotificationService.js";

const router = Router();

router.get("/inbox", async (req, res) => {
  if (!isFeatureEnabled("push")) return res.json({ items: [], disabled: true });
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const result = await listUserInbox(requireSupabase(), req.auth.id);
    res.json({
      items: result.items,
      missing: result.missing,
      ...(result.missing ? { setupHint: PUSH_SETUP_HINT } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/token", async (req, res) => {
  if (!isFeatureEnabled("push")) {
    return res.status(404).json({ error: "Push is not enabled", disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  const token = String(req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "token required" });
  try {
    const result = await upsertPushToken(requireSupabase(), {
      userId: req.auth.id,
      platform: req.body?.platform,
      token,
      optIn: req.body?.optIn !== false,
      topics: req.body?.topics,
    });
    if (result.missing) return res.status(503).json({ error: PUSH_SETUP_HINT, missing: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

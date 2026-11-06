import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import {
  SUPPORT_SETUP_HINT,
  listThreadsForUser,
  listAllThreadsAdmin,
  getOrCreateThread,
  listMessages,
  postMessage,
} from "../lib/supportChatService.js";

const router = Router();

/** Static FAQ for delivery fees / cutoffs — also mirrored in i18n on the client. */
router.get("/faq", (_req, res) => {
  res.json({
    items: [
      {
        id: "delivery-fee",
        question: "How much is delivery?",
        answer:
          "Delivery is UGX 15,000. Orders of UGX 100,000 or more qualify for free delivery (One Source Plus benefit for everyone).",
      },
      {
        id: "cutoff",
        question: "What is the same-day delivery cutoff?",
        answer:
          "Place orders before 14:00 East Africa Time for same-day delivery in covered Kampala areas. Later orders go out the next delivery window.",
      },
      {
        id: "returns",
        question: "How do returns work?",
        answer:
          "Open your order, request a return for a line item, and attach a photo. We review without automatic refunds.",
      },
    ],
  });
});

router.get("/threads", async (req, res) => {
  if (!isFeatureEnabled("chat")) {
    return res.json({ threads: [], disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const result = await listThreadsForUser(requireSupabase(), req.auth.id);
    res.json({
      threads: result.threads,
      missing: result.missing,
      ...(result.missing ? { setupHint: SUPPORT_SETUP_HINT } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/threads", async (req, res) => {
  if (!isFeatureEnabled("chat")) {
    return res.status(404).json({ error: "Chat is not enabled", disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const db = requireSupabase();
    const orderId = req.body?.orderId ? String(req.body.orderId) : null;
    if (orderId) {
      const { data: order } = await db
        .from("orders")
        .select("id, user_id")
        .eq("id", orderId)
        .maybeSingle();
      if (!order || order.user_id !== req.auth.id) {
        return res.status(404).json({ error: "Order not found" });
      }
    }
    const result = await getOrCreateThread(db, {
      userId: req.auth.id,
      orderId,
      subject: req.body?.subject,
    });
    if (result.missing) return res.status(503).json({ error: SUPPORT_SETUP_HINT, missing: true });
    res.status(201).json({ thread: result.thread });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/threads/:id/messages", async (req, res) => {
  if (!isFeatureEnabled("chat")) return res.json({ messages: [], disabled: true });
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const db = requireSupabase();
    const { data: thread } = await db
      .from("support_threads")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    if (!thread || (thread.user_id !== req.auth.id && !req.isAdmin)) {
      return res.status(404).json({ error: "Thread not found" });
    }
    const result = await listMessages(db, thread.id);
    res.json({ messages: result.messages, missing: result.missing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/threads/:id/messages", async (req, res) => {
  if (!isFeatureEnabled("chat")) {
    return res.status(404).json({ error: "Chat is not enabled", disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const db = requireSupabase();
    const { data: thread } = await db
      .from("support_threads")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    if (!thread) return res.status(404).json({ error: "Thread not found" });
    const asSupport = Boolean(req.isAdmin && req.body?.asSupport);
    if (!asSupport && thread.user_id !== req.auth.id) {
      return res.status(404).json({ error: "Thread not found" });
    }
    const result = await postMessage(db, {
      threadId: thread.id,
      senderRole: asSupport ? "support" : "customer",
      senderUserId: req.auth.id,
      body: req.body?.body,
    });
    if (result.missing) return res.status(503).json({ error: SUPPORT_SETUP_HINT, missing: true });
    res.status(201).json({ message: result.message });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** Admin mirror */
router.get("/admin/threads", async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Administrator access is required." });
  try {
    const result = await listAllThreadsAdmin(requireSupabase());
    res.json({
      threads: result.threads,
      missing: result.missing,
      ...(result.missing ? { setupHint: SUPPORT_SETUP_HINT } : {}),
      warning:
        "Admin panel requires a signed-in administrator (ADMIN_USER_IDS or app_metadata.role=admin).",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

import { Router } from "express";
import multer from "multer";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import { processAndStoreImage } from "../lib/imageUpload.js";
import {
  RETURNS_SETUP_HINT,
  createReturnRequest,
  listReturnsForOrder,
  updateReturnStatus,
} from "../lib/returnsService.js";
import { logInfo } from "../lib/requestLog.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.get("/order/:orderId", async (req, res) => {
  if (!isFeatureEnabled("returns")) {
    return res.json({ returns: [], disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const result = await listReturnsForOrder(requireSupabase(), req.params.orderId, req.auth.id);
    res.json({
      returns: result.returns,
      missing: result.missing,
      ...(result.missing ? { setupHint: RETURNS_SETUP_HINT } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", upload.single("photo"), async (req, res) => {
  if (!isFeatureEnabled("returns")) {
    return res.status(404).json({ error: "Returns are not enabled", disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });

  const orderId = String(req.body?.orderId || "").trim();
  const reason = String(req.body?.reason || "").trim();
  if (!orderId || !reason) {
    return res.status(400).json({ error: "orderId and reason are required" });
  }

  try {
    const db = requireSupabase();
    const { data: order, error: orderErr } = await db
      .from("orders")
      .select("id, user_id")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order || order.user_id !== req.auth.id) {
      return res.status(404).json({ error: "Order not found" });
    }

    let photoPath = null;
    if (req.file?.buffer) {
      const stored = await processAndStoreImage(req, req.file.buffer, {
        folder: `returns/${orderId}`,
        mime: req.file.mimetype,
      });
      photoPath = stored.path || stored.url;
    }

    const result = await createReturnRequest(db, {
      orderId,
      orderItemId: req.body?.orderItemId || null,
      userId: req.auth.id,
      productId: req.body?.productId || null,
      reason,
      photoPath,
    });

    logInfo("returns", "return requested", {
      requestId: req.requestId,
      orderId,
      userId: req.auth.id,
    });

    if (result.missing) {
      return res.status(503).json({ error: RETURNS_SETUP_HINT, missing: true });
    }
    res.status(201).json({
      returnRequest: result.returnRequest,
      note: "No refund is processed automatically — status tracking only.",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Administrator access is required." });
  try {
    const result = await updateReturnStatus(
      requireSupabase(),
      req.params.id,
      String(req.body?.status || ""),
      req.body?.adminNote
    );
    if (result.missing) return res.status(503).json({ error: RETURNS_SETUP_HINT, missing: true });
    res.json({ returnRequest: result.returnRequest });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;

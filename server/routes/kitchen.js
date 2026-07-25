import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import {
  getKitchenCollage,
  upsertKitchenCollage,
  seedKitchenCollage,
  KITCHEN_COLLAGE_SETUP_HINT,
} from "../lib/kitchenCollageService.js";

const router = Router();

router.get("/collage", async (req, res) => {
  try {
    const db = requireSupabase();
    const admin = req.query.admin === "true";
    const collage = await getKitchenCollage(db, { admin });
    res.json({ collage });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/collage", async (req, res) => {
  try {
    const db = requireSupabase();
    const collage = await upsertKitchenCollage(db, req.body || {});
    res.json({ collage, message: "Kitchen collage saved" });
  } catch (e) {
    const status = e.code === "SETUP_REQUIRED" ? 503 : 400;
    res.status(status).json({
      error: e.message,
      hint: e.code === "SETUP_REQUIRED" ? KITCHEN_COLLAGE_SETUP_HINT : undefined,
    });
  }
});

router.post("/collage/reset", async (req, res) => {
  try {
    const db = requireSupabase();
    const collage = await seedKitchenCollage(db);
    res.json({ collage, message: "Kitchen collage reset to defaults" });
  } catch (e) {
    const status = e.code === "SETUP_REQUIRED" || (e.message || "").includes("does not exist")
      ? 503
      : 400;
    res.status(status).json({
      error: e.message,
      hint: KITCHEN_COLLAGE_SETUP_HINT,
    });
  }
});

export default router;

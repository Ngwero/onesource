import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import {
  listPackagingMaterials,
  getPackagingMaterial,
  createPackagingMaterial,
  updatePackagingMaterial,
  adjustPackagingStock,
  deletePackagingMaterial,
  PACKAGING_TYPES,
  PACKAGING_TABLE_SETUP_HINT,
} from "../lib/packagingService.js";

const router = Router();

router.get("/types", (_req, res) => {
  res.json({ types: PACKAGING_TYPES });
});

router.get("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const activeOnly = req.query.active === "true";
    const type = req.query.type;
    const materials = await listPackagingMaterials(db, { activeOnly, type });
    res.json({ materials });
  } catch (e) {
    const status = e.code === "TABLE_MISSING" ? 503 : 500;
    res.status(status).json({
      error: e.message,
      hint: e.code === "TABLE_MISSING" ? PACKAGING_TABLE_SETUP_HINT : undefined,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const material = await getPackagingMaterial(db, req.params.id);
    res.json({ material });
  } catch (e) {
    const status = e.code === "NOT_FOUND" ? 404 : e.code === "TABLE_MISSING" ? 503 : 500;
    res.status(status).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const material = await createPackagingMaterial(db, req.body);
    res.status(201).json({ material, message: "Packaging material created" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const material = await updatePackagingMaterial(db, req.params.id, req.body);
    res.json({ material, message: "Packaging material updated" });
  } catch (e) {
    const status = e.code === "NOT_FOUND" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

router.patch("/:id/stock", async (req, res) => {
  try {
    const db = requireSupabase();
    const delta = Number(req.body.delta ?? req.body.adjust ?? 0);
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: "delta must be a non-zero number" });
    }
    const material = await adjustPackagingStock(db, req.params.id, delta);
    res.json({ material, message: "Stock adjusted" });
  } catch (e) {
    const status = e.code === "NOT_FOUND" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const result = await deletePackagingMaterial(db, req.params.id);
    res.json(result);
  } catch (e) {
    const status = e.code === "NOT_FOUND" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

export default router;

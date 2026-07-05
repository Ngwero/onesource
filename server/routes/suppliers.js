import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  updateSupplierStatus,
  deleteSupplier,
} from "../lib/suppliersService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const admin = req.query.admin === "true";
    const status = req.query.status;
    const suppliers = await listSuppliers(db, { admin, status });
    res.json({ suppliers });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const supplier = await getSupplier(db, req.params.id);
    res.json({ supplier });
  } catch (e) {
    const status = e.message === "Supplier not found" ? 404 : 500;
    res.status(status).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const supplier = await createSupplier(db, req.body);
    res.status(201).json({ supplier, message: "Supplier created" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const supplier = await updateSupplier(db, req.params.id, req.body);
    res.json({ supplier, message: "Supplier updated" });
  } catch (e) {
    const status = e.message === "Supplier not found" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const db = requireSupabase();
    const status = req.body.status;
    const supplier = await updateSupplierStatus(db, req.params.id, status);
    res.json({ supplier, message: `Supplier status set to ${supplier.status}` });
  } catch (e) {
    const status = e.message === "Supplier not found" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const result = await deleteSupplier(db, req.params.id);
    res.json(result);
  } catch (e) {
    const status =
      e.message === "Supplier not found"
        ? 404
        : e.message.includes("Cannot delete")
          ? 409
          : 400;
    res.status(status).json({ error: e.message });
  }
});

export default router;

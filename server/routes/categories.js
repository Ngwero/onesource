import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import {
  listCategories,
  updateCategoryBanner,
  deleteCategory,
  CATEGORIES_TABLE_SETUP_HINT,
  categoriesTableSupportsDelete,
} from "../lib/categoriesService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const admin = req.query.admin === "true";
    const categories = await listCategories(db, { admin });
    const canDelete = admin ? await categoriesTableSupportsDelete(db) : undefined;
    res.json({ categories, canDelete });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const result = await deleteCategory(db, req.params.id);
    res.json(result);
  } catch (e) {
    const status =
      e.message === "Unknown category"
        ? 404
        : e.message?.includes("categories table") ||
            e.message === CATEGORIES_TABLE_SETUP_HINT
          ? 503
          : 500;
    res.status(status).json({ error: e.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const { image } = req.body ?? {};
    if (image !== undefined && image !== null && typeof image !== "string") {
      return res.status(400).json({ error: "image must be a URL string or empty" });
    }
    const category = await updateCategoryBanner(db, req.params.id, {
      image: image ?? "",
    });
    res.json({ category, message: "Category banner updated" });
  } catch (e) {
    const status = e.message === "Unknown category" ? 404 : 500;
    res.status(status).json({ error: e.message });
  }
});

export default router;

import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireSupabase } from "../lib/supabase.js";
import {
  rowToProduct,
  parseBody,
  validateProduct,
  normalizeCategoryId,
} from "../db.js";
import { listCategories } from "../lib/categoriesService.js";
import { categoryMatchAliases } from "../data/categories.js";
import { withLocalProductFallback } from "../lib/localSeed.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const admin = req.query.admin === "true";
    const category = req.query.category;
    const search = req.query.q?.toLowerCase();
    const page = Math.max(0, parseInt(req.query.page ?? "0", 10) || 0);
    const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize ?? "1000", 10) || 1000));

    const result = await withLocalProductFallback(
      async () => {
        const db = requireSupabase();
        let query = db.from("products").select("*", { count: "exact" }).order("created_at", {
          ascending: false,
        });

        if (!admin) {
          query = query.eq("in_stock", true).gt("stock_quantity", 0);
        }
        if (category) {
          query = query.in("category", categoryMatchAliases(category));
        }

        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data: rows, error, count } = await query;
        if (error) throw error;

        let filtered = rows ?? [];
        if (search) {
          filtered = filtered.filter(
            (r) =>
              r.title.toLowerCase().includes(search) ||
              r.description.toLowerCase().includes(search) ||
              r.category.toLowerCase().includes(search)
          );
        }

        return {
          products: filtered.map(rowToProduct),
          total: count ?? filtered.length,
        };
      },
      { admin, category, search, page, pageSize }
    );

    res.json({
      products: result.products,
      total: result.total,
      ...(result.source === "local-seed" ? { source: "local-seed" } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const db = requireSupabase();
    const categories = await listCategories(db, { admin: false });
    res.json({ categories });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await withLocalProductFallback(
      async () => {
        const db = requireSupabase();
        const { data: row, error } = await db
          .from("products")
          .select("*")
          .eq("id", req.params.id)
          .maybeSingle();

        if (error) throw error;
        if (!row) {
          const err = new Error("Product not found");
          err.status = 404;
          throw err;
        }
        return { product: rowToProduct(row) };
      },
      { productId: req.params.id }
    );

    res.json({ product: result.product });
  } catch (e) {
    const status = e.status === 404 ? 404 : 500;
    res.status(status).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const data = parseBody(req.body);
    data.id = data.id || uuidv4();

    const errors = validateProduct(data);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const { data: existing } = await db
      .from("products")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "Product id already exists" });
    }

    const { data: row, error } = await db
      .from("products")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ product: rowToProduct(row), message: "Product created" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const { data: existing, error: fetchErr } = await db
      .from("products")
      .select("id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: "Product not found" });

    const data = parseBody(req.body, { id: req.params.id });
    const errors = validateProduct(data, true);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const { data: row, error } = await db
      .from("products")
      .update(data)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ product: rowToProduct(row), message: "Product updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/:id/stock", async (req, res) => {
  try {
    const db = requireSupabase();
    const { data: existing, error: fetchErr } = await db
      .from("products")
      .select("id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: "Product not found" });

    const qty = Math.max(
      0,
      Math.floor(Number(req.body.stockQuantity ?? req.body.stock_quantity))
    );
    if (Number.isNaN(qty)) {
      return res.status(400).json({ error: "stockQuantity must be a number" });
    }

    const { data: row, error } = await db
      .from("products")
      .update({
        stock_quantity: qty,
        in_stock: qty > 0,
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ product: rowToProduct(row), message: "Stock updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const { data, error } = await db
      .from("products")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

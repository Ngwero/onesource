import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";

const router = Router();

const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const ORDER_SELECT = `
  id,
  user_id,
  status,
  email,
  full_name,
  phone,
  address_line1,
  address_line2,
  city,
  district,
  notes,
  subtotal,
  delivery_fee,
  total,
  currency,
  created_at,
  updated_at,
  order_items (
    id,
    product_id,
    product_title,
    product_image,
    unit_price,
    quantity,
    line_total
  )
`;

function validateOrderBody(body) {
  const {
    userId,
    email,
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    district,
    notes,
    subtotal,
    deliveryFee,
    total,
    items,
  } = body ?? {};

  if (!email?.trim() || !fullName?.trim() || !addressLine1?.trim() || !city?.trim()) {
    return { error: "Missing required delivery details" };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Order must include at least one item" };
  }

  const sub = Number(subtotal);
  const del = Number(deliveryFee);
  const tot = Number(total);
  if (!Number.isFinite(sub) || !Number.isFinite(del) || !Number.isFinite(tot)) {
    return { error: "Invalid order totals" };
  }

  const computedItems = items.map((row) => {
    const qty = Number(row.quantity);
    const unit = Number(row.unitPrice);
    if (!row.productId || !row.title || qty < 1 || unit < 0) {
      throw new Error("Invalid line item");
    }
    return {
      product_id: String(row.productId),
      product_title: String(row.title),
      product_image: row.image ? String(row.image) : null,
      unit_price: unit,
      quantity: qty,
      line_total: unit * qty,
    };
  });

  const itemsSum = computedItems.reduce((s, i) => s + i.line_total, 0);
  if (Math.abs(itemsSum - sub) > 1) {
    return { error: "Subtotal does not match line items" };
  }
  if (Math.abs(sub + del - tot) > 1) {
    return { error: "Total does not match subtotal + delivery" };
  }

  return {
    order: {
      user_id: userId || null,
      status: "placed",
      email: email.trim(),
      full_name: fullName.trim(),
      phone: phone?.trim() || null,
      address_line1: addressLine1.trim(),
      address_line2: addressLine2?.trim() || null,
      city: city.trim(),
      district: district?.trim() || "Kampala",
      notes: notes?.trim() || null,
      subtotal: sub,
      delivery_fee: del,
      total: tot,
      currency: "UGX",
    },
    items: computedItems,
  };
}

router.post("/", async (req, res) => {
  try {
    const parsed = validateOrderBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const db = requireSupabase();
    const { data: order, error: orderErr } = await db
      .from("orders")
      .insert(parsed.order)
      .select("id, status, total, created_at")
      .single();

    if (orderErr) throw orderErr;

    const rows = parsed.items.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsErr } = await db.from("order_items").insert(rows);
    if (itemsErr) {
      await db.from("orders").delete().eq("id", order.id);
      throw itemsErr;
    }

    res.status(201).json({ order: { ...order, ...parsed.order } });
  } catch (e) {
    console.error("[orders] POST", e.message);
    res.status(500).json({ error: e.message || "Failed to place order" });
  }
});

router.get("/", async (req, res) => {
  const admin = req.query.admin === "true";
  const userId = req.query.userId;
  const status = req.query.status?.trim();

  if (!admin && !userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const db = requireSupabase();
    let query = db.from("orders").select(ORDER_SELECT);

    if (!admin) {
      query = query.eq("user_id", userId);
    }
    if (status && ORDER_STATUSES.includes(status)) {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    res.json({ orders: orders ?? [] });
  } catch (e) {
    console.error("[orders] GET", e.message);
    res.status(500).json({ error: e.message || "Failed to load orders" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body ?? {};

  if (!status || !ORDER_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${ORDER_STATUSES.join(", ")}`,
    });
  }

  try {
    const db = requireSupabase();
    const { data: order, error } = await db
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();

    if (error) throw error;
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (e) {
    console.error("[orders] PATCH", e.message);
    res.status(500).json({ error: e.message || "Failed to update order" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId;

  try {
    const db = requireSupabase();
    let query = db.from("orders").select(ORDER_SELECT).eq("id", id);

    if (userId) query = query.eq("user_id", userId);

    const { data: order, error } = await query.maybeSingle();
    if (error) throw error;
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to load order" });
  }
});

export default router;

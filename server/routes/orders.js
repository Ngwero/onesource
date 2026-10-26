import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { hasPublishedColumn } from "../lib/productColumns.js";
import { parseOrderRequest, priceOrderFromCatalogue } from "../lib/orderPricing.js";
import { reserveStock, releaseStock } from "../lib/stockReservation.js";
import {
  sendOrderConfirmedEmail,
  sendOrderDispatchedEmail,
  sendOrderDeliveredEmail,
  sendOrderPlacedEmail,
  isMailConfigured,
} from "../lib/mail.js";

import { createOrderAccessToken, verifyOrderAccessToken } from "../lib/orderAccess.js";

export function createOrdersRouter({ getDb = requireSupabase } = {}) {
  const router = Router();
  const EXPORT_ORDER_MARKER = "[ORDER_TYPE:EXPORT]";

  function decorateOrder(order) {
    if (!order) return order;
    const notes = order.notes || "";
    const isExport = notes.startsWith(EXPORT_ORDER_MARKER);
    return {
      ...order,
      order_type: isExport ? "export" : "retail",
      notes: isExport
        ? notes.slice(EXPORT_ORDER_MARKER.length).replace(/^\s*\n?/, "") || null
        : order.notes,
    };
  }

  const ORDER_STATUSES = [
    "placed",
    "confirmed",
    "packed",
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
    packaging_material_id,
    packaging_notes,
    packed_at,
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

  const CATALOGUE_COLUMNS = "id,title,price,image,in_stock,stock_quantity";

  async function loadCatalogueRows(db, ids) {
    const unique = [...new Set(ids)];
    const publishedColumn = await hasPublishedColumn(db);
    const columns = publishedColumn ? `${CATALOGUE_COLUMNS},published` : CATALOGUE_COLUMNS;
    const { data, error } = await db.from("products").select(columns).in("id", unique);
    if (error) throw error;
    return data ?? [];
  }

  function buildOrderRow(contact, priced) {
    return {
      user_id: contact.user_id,
      status: "placed",
      email: contact.email,
      full_name: contact.full_name,
      phone: contact.phone,
      address_line1: contact.address_line1,
      address_line2: contact.address_line2,
      city: contact.city,
      district: contact.district,
      notes:
        contact.orderType === "export"
          ? `${EXPORT_ORDER_MARKER}${contact.notes ? `\n${contact.notes}` : ""}`
          : contact.notes,
      subtotal: priced.subtotal,
      delivery_fee: priced.delivery_fee,
      total: priced.total,
      currency: "UGX",
    };
  }

  router.post("/", async (req, res) => {
    let reserved = null;
    let db;
    try {
      const parsed = parseOrderRequest(req.body);
      if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
      }

      parsed.contact.user_id = req.auth?.id || null;
      db = getDb();
      const rows = await loadCatalogueRows(
        db,
        parsed.lines.map((line) => line.productId)
      );
      const priced = priceOrderFromCatalogue(parsed.lines, rows);
      if (priced.error) {
        return res.status(priced.status || 400).json({
          error: priced.error,
          ...(priced.productId ? { productId: priced.productId } : {}),
        });
      }

      reserved = await reserveStock(db, priced.items);
      if (!reserved.ok) {
        return res.status(409).json({
          error: reserved.error,
          ...(reserved.productId ? { productId: reserved.productId } : {}),
        });
      }

      const orderRow = buildOrderRow(parsed.contact, priced);
      const { data: order, error: orderErr } = await db
        .from("orders")
        .insert(orderRow)
        .select("id, status, total, created_at")
        .single();

      if (orderErr) throw orderErr;

      const itemRows = priced.items.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsErr } = await db.from("order_items").insert(itemRows);
      if (itemsErr) {
        await db.from("orders").delete().eq("id", order.id);
        throw itemsErr;
      }

      reserved = null;
      const { data: fullOrder, error: fetchErr } = await db
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", order.id)
        .single();

      if (!fetchErr && fullOrder) {
        sendOrderPlacedEmail(decorateOrder(fullOrder))
          .then((r) => {
            if (r?.sent) console.log(`[orders] placed email sent → ${fullOrder.email}`);
          })
          .catch((e) => console.error("[orders] placed email failed:", e.message));
      }

      res.status(201).json({
        order: decorateOrder({ ...order, ...orderRow, order_items: itemRows }),
        ...(!req.auth ? { accessToken: createOrderAccessToken(order.id) } : {}),
      });
    } catch (e) {
      if (reserved?.ok && db) {
        await releaseStock(db, reserved.reserved, { via: reserved.via }).catch((releaseErr) => {
          console.error("[orders] stock release failed:", releaseErr.message);
        });
      }
      console.error("[orders] POST", e.message);
      res.status(500).json({ error: e.message || "Failed to place order" });
    }
  });

  router.get("/", async (req, res) => {
    const admin = req.isAdmin && req.query.admin === "true";
    const userId = req.auth?.id;
    const status = req.query.status?.trim();

    if (!admin && !userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      const db = getDb();
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
      res.json({ orders: (orders ?? []).map(decorateOrder) });
    } catch (e) {
      console.error("[orders] GET", e.message);
      res.status(500).json({ error: e.message || "Failed to load orders" });
    }
  });

  router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { status, packagingMaterialId, packagingNotes } = req.body ?? {};

    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${ORDER_STATUSES.join(", ")}`,
      });
    }

    try {
      const db = getDb();
      const { data: existing, error: fetchErr } = await db
        .from("orders")
        .select("id, status")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!existing) return res.status(404).json({ error: "Order not found" });

      const previousStatus = existing.status;
      const patch = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (packagingMaterialId !== undefined) {
        patch.packaging_material_id = packagingMaterialId || null;
      }
      if (packagingNotes !== undefined) {
        patch.packaging_notes = String(packagingNotes || "").trim() || null;
      }
      if (status === "packed" && previousStatus !== "packed") {
        patch.packed_at = new Date().toISOString();
      }

      const { data: order, error } = await db
        .from("orders")
        .update(patch)
        .eq("id", id)
        .select(ORDER_SELECT)
        .single();

      if (error) throw error;
      if (!order) return res.status(404).json({ error: "Order not found" });

      // Deduct one packaging unit when first marked packed
      if (
        status === "packed" &&
        previousStatus !== "packed" &&
        order.packaging_material_id
      ) {
        try {
          const { adjustPackagingStock } = await import("../lib/packagingService.js");
          await adjustPackagingStock(db, order.packaging_material_id, -1);
        } catch (stockErr) {
          console.warn("[orders] packaging stock adjust skipped:", stockErr.message);
        }
      }

      let emailSent = null;
      if (previousStatus !== status) {
        if (status === "confirmed") {
          sendOrderConfirmedEmail(decorateOrder(order))
            .then((r) => {
              if (r?.sent) console.log(`[orders] confirmation email sent → ${order.email}`);
            })
            .catch((e) => console.error("[orders] confirmation email failed:", e.message));
          emailSent = isMailConfigured() ? "confirmation_pending" : "smtp_not_configured";
        } else if (status === "out_for_delivery") {
          sendOrderDispatchedEmail(decorateOrder(order))
            .then((r) => {
              if (r?.sent) console.log(`[orders] dispatch email sent → ${order.email}`);
            })
            .catch((e) => console.error("[orders] dispatch email failed:", e.message));
          emailSent = isMailConfigured() ? "dispatch_pending" : "smtp_not_configured";
        } else if (status === "delivered") {
          sendOrderDeliveredEmail(decorateOrder(order))
            .then((r) => {
              if (r?.sent) console.log(`[orders] delivered email sent → ${order.email}`);
            })
            .catch((e) => console.error("[orders] delivered email failed:", e.message));
          emailSent = isMailConfigured() ? "delivered_pending" : "smtp_not_configured";
        }
      }

      res.json({ order: decorateOrder(order), emailSent });
    } catch (e) {
      console.error("[orders] PATCH", e.message);
      res.status(500).json({ error: e.message || "Failed to update order" });
    }
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const userId = req.auth?.id;
    const guestAccess = verifyOrderAccessToken(req.get("x-order-token"), id);
    if (!req.isAdmin && !userId && !guestAccess) {
      return res.status(401).json({ error: "Please sign in or use your order confirmation session." });
    }

    try {
      const db = getDb();
      let query = db.from("orders").select(ORDER_SELECT).eq("id", id);

      if (!req.isAdmin) {
        if (guestAccess) query = query.is("user_id", null);
        else query = query.eq("user_id", userId);
      }

      const { data: order, error } = await query.maybeSingle();
      if (error) throw error;
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json({ order: decorateOrder(order) });
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to load order" });
    }
  });

  return router;
}

export default createOrdersRouter();

import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { hasPublishedColumn } from "../lib/productColumns.js";
import {
  parseOrderRequest,
  priceOrderFromCatalogue,
  ORDER_CURRENCY,
} from "../lib/orderPricing.js";
import {
  holdCheckoutStock,
  releaseCheckoutHold,
  claimStockForOrder,
  markHoldConverted,
  rollbackClaimedStock,
} from "../lib/stockReservation.js";
import {
  readIdempotencyKey,
  orderRequestFingerprint,
  lookupIdempotency,
  persistIdempotency,
} from "../lib/idempotency.js";
import {
  sendOrderConfirmedEmail,
  sendOrderDispatchedEmail,
  sendOrderDeliveredEmail,
  sendOrderPlacedEmail,
  isMailConfigured,
} from "../lib/mail.js";

import { createOrderAccessToken, verifyOrderAccessToken } from "../lib/orderAccess.js";
import { getMembershipTier } from "../lib/membershipService.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import { dealPriceMap } from "../lib/dealsService.js";
import { enqueueUserNotification } from "../lib/pushNotificationService.js";
import { logInfo } from "../lib/requestLog.js";

export function createOrdersRouter({ getDb = requireSupabase } = {}) {
  const router = Router();
  const EXPORT_ORDER_MARKER = "[ORDER_TYPE:EXPORT]";

  async function priceWithDeals(db, lines, rows, req) {
    let dealPriceByProductId;
    let membershipTier = "standard";
    let freeDeliveryThreshold;
    if (isFeatureEnabled("membership") && req?.auth?.id) {
      try {
        const membership = await getMembershipTier(db, req.auth.id);
        membershipTier = membership.tier;
        freeDeliveryThreshold = membership.freeDeliveryThreshold;
      } catch (e) {
        logInfo("orders", "membership lookup skipped", {
          error: e.message,
          requestId: req?.requestId,
        });
      }
    }
    if (isFeatureEnabled("timedDeals") || isFeatureEnabled("deals")) {
      try {
        dealPriceByProductId = await dealPriceMap(
          db,
          lines.map((l) => l.productId),
          { isMember: membershipTier !== "standard" }
        );
      } catch (e) {
        logInfo("orders", "deal overlay skipped", { error: e.message, requestId: req?.requestId });
      }
    }
    return priceOrderFromCatalogue(lines, rows, {
      dealPriceByProductId,
      membershipTier,
      freeDeliveryThreshold,
    });
  }

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
      currency: priced.currency || ORDER_CURRENCY,
    };
  }

  /** Start checkout: hold stock for ~10 minutes. */
  router.post("/reserve", async (req, res) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const lines = items
        .map((row) => ({
          product_id: String(row.productId ?? row.product_id ?? "").trim(),
          quantity: Math.floor(Number(row.quantity)),
        }))
        .filter((row) => row.product_id && row.quantity > 0);
      if (!lines.length) {
        return res.status(400).json({ error: "items required" });
      }
      const db = getDb();
      const rows = await loadCatalogueRows(
        db,
        lines.map((line) => line.product_id)
      );
      const priced = await priceWithDeals(
        db,
        lines.map((line) => ({
          productId: line.product_id,
          quantity: line.quantity,
        })),
        rows,
        req
      );
      if (priced.error) {
        return res.status(priced.status || 400).json({
          error: priced.error,
          ...(priced.productId ? { productId: priced.productId } : {}),
        });
      }
      const hold = await holdCheckoutStock(db, priced.items);
      if (!hold.ok) {
        return res.status(409).json({
          error: hold.error,
          ...(hold.productId ? { productId: hold.productId } : {}),
        });
      }
      res.status(201).json({
        reservationId: hold.reservationId,
        expiresAt: hold.expiresAt,
        expiresInMs: hold.expiresInMs,
        subtotal: priced.subtotal,
        deliveryFee: priced.delivery_fee,
        total: priced.total,
        currency: priced.currency,
        items: priced.items,
      });
    } catch (e) {
      console.error("[orders] POST /reserve", e.message);
      res.status(500).json({ error: e.message || "Failed to reserve stock" });
    }
  });

  /** Abandon checkout: release a hold early. */
  router.delete("/reserve/:id", async (req, res) => {
    try {
      const db = getDb();
      await releaseCheckoutHold(db, req.params.id);
      res.json({ ok: true });
    } catch (e) {
      console.error("[orders] DELETE /reserve", e.message);
      res.status(500).json({ error: e.message || "Failed to release reservation" });
    }
  });

  router.post("/", async (req, res) => {
    let claim = null;
    let db;
    try {
      const parsed = parseOrderRequest(req.body);
      if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
      }

      parsed.contact.user_id = req.auth?.id || null;
      const idempotencyKey = readIdempotencyKey(req);
      const fingerprint = orderRequestFingerprint(parsed);
      db = getDb();

      if (idempotencyKey) {
        const prior = await lookupIdempotency(db, idempotencyKey);
        if (prior) {
          if (prior.fingerprint !== fingerprint) {
            return res.status(409).json({
              error: "Idempotency key was already used with a different request",
            });
          }
          return res.status(prior.responseStatus || 201).json(prior.responseBody);
        }
      }

      const rows = await loadCatalogueRows(
        db,
        parsed.lines.map((line) => line.productId)
      );
      const priced = await priceWithDeals(db, parsed.lines, rows, req);
      if (priced.error) {
        return res.status(priced.status || 400).json({
          error: priced.error,
          ...(priced.productId ? { productId: priced.productId } : {}),
        });
      }

      const reservationId =
        String(req.body?.reservationId ?? req.body?.reservation_id ?? "").trim() ||
        null;
      claim = await claimStockForOrder(db, priced.items, { reservationId });
      if (!claim.ok) {
        return res.status(claim.status || 409).json({
          error: claim.error,
          ...(claim.productId ? { productId: claim.productId } : {}),
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

      if (claim.consumedHold && claim.reservationId) {
        await markHoldConverted(db, claim.reservationId, order.id);
      }
      claim = null;

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

      const body = {
        order: decorateOrder({ ...order, ...orderRow, order_items: itemRows }),
        ...(!req.auth ? { accessToken: createOrderAccessToken(order.id) } : {}),
      };
      if (idempotencyKey) {
        await persistIdempotency(db, {
          key: idempotencyKey,
          fingerprint,
          orderId: order.id,
          responseStatus: 201,
          responseBody: body,
        });
      }
      res.status(201).json(body);
    } catch (e) {
      if (claim?.ok && db) {
        await rollbackClaimedStock(db, claim).catch((releaseErr) => {
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
        if (order.user_id && isFeatureEnabled("push")) {
          enqueueUserNotification(db, {
            userId: order.user_id,
            topic: "order_status",
            title: "Order update",
            body: `Your order is now ${status.replace(/_/g, " ")}.`,
            href: `/orders/${order.id}`,
          }).catch((e) => console.warn("[orders] push enqueue skipped:", e.message));
        }
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

      res.json({ order: decorateOrder(order), emailSent, requestId: req.requestId });
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

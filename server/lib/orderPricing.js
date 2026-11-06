/**
 * Checkout totals are always computed from the live catalogue.
 * Client unit prices, line totals, and order totals are display-only.
 * Amounts are integers in UGX minor units (whole shillings).
 */

import { asMoneyInteger, BASE_CURRENCY } from "./money.js";

export const DELIVERY_FEE_UGX = 15_000;
export const FREE_DELIVERY_THRESHOLD_UGX = 100_000;
/** Member tier free-delivery threshold (UGX). Override via env when wiring membership. */
export const MEMBER_FREE_DELIVERY_THRESHOLD_UGX = Number(
  process.env.MEMBER_FREE_DELIVERY_THRESHOLD_UGX || 50_000
);
export const ORDER_CURRENCY = BASE_CURRENCY;

/**
 * @param {number} subtotalUgx
 * @param {{ membershipTier?: string, freeDeliveryThreshold?: number }} [opts]
 */
export function calcDeliveryFee(subtotalUgx, opts = {}) {
  const subtotal = asMoneyInteger(subtotalUgx) ?? 0;
  const tier = opts.membershipTier;
  const threshold =
    opts.freeDeliveryThreshold ??
    (tier && tier !== "standard" && tier !== "none"
      ? MEMBER_FREE_DELIVERY_THRESHOLD_UGX
      : FREE_DELIVERY_THRESHOLD_UGX);
  return subtotal >= threshold ? 0 : DELIVERY_FEE_UGX;
}

export function calcOrderTotal(subtotalUgx, opts = {}) {
  const subtotal = asMoneyInteger(subtotalUgx) ?? 0;
  const delivery = calcDeliveryFee(subtotal, opts);
  return { delivery, total: subtotal + delivery };
}

function readProductId(row) {
  return String(row?.productId ?? row?.product_id ?? "").trim();
}

/** Contact + line ids/qty only. Prices on the body are ignored. */
export function parseOrderRequest(body) {
  const {
    email,
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    district,
    notes,
    orderType,
    items,
  } = body ?? {};

  const required = [email, fullName, addressLine1, city];
  const optional = [phone, addressLine2, district, notes];
  if (required.some(value => typeof value !== "string" || !value.trim() || value.length > 1000) ||
      optional.some(value => value != null && (typeof value !== "string" || value.length > 4000))) {
    return { error: "Missing required delivery details" };
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return { error: "Order must include at least one item" };
  }
  if (orderType && !["retail", "export"].includes(orderType)) {
    return { error: "Invalid order type" };
  }

  const lines = [];
  for (const row of items) {
    const productId = readProductId(row);
    const qty = Number(row?.quantity);
    if (!productId) {
      return { error: "Invalid line item" };
    }
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 10000) {
      return { error: "Quantity must be at least 1" };
    }
    const existing = lines.find(line => line.productId === productId);
    if (existing) {
      existing.quantity += qty;
      if (existing.quantity > 10000) return { error: "Quantity is too large" };
      continue;
    }
    lines.push({
      productId,
      quantity: qty,
      clientTitle: row?.title ? String(row.title) : "",
      clientImage: row?.image ? String(row.image) : "",
    });
  }

  return {
    contact: {
      user_id: null,
      email: email.trim(),
      full_name: fullName.trim(),
      phone: phone?.trim() || null,
      address_line1: addressLine1.trim(),
      address_line2: addressLine2?.trim() || null,
      city: city.trim(),
      district: district?.trim() || "Kampala",
      orderType: orderType === "export" ? "export" : "retail",
      notes: notes?.trim() || null,
    },
    lines,
  };
}

function productMap(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    if (row?.id) map.set(String(row.id), row);
  }
  return map;
}

function cataloguePrice(product) {
  return asMoneyInteger(product.price);
}

function catalogueStock(product) {
  return Math.floor(Number(product.stock_quantity ?? product.stockQuantity ?? 0));
}

function isPublished(product) {
  return product.published !== false;
}

function isListed(product) {
  const stock = catalogueStock(product);
  const flaggedIn =
    product.in_stock !== false && product.inStock !== false;
  return flaggedIn && stock > 0;
}

/**
 * Recalculate every line from catalogue rows. Client prices are discarded.
 * `products` may be an array of rows or a Map keyed by id.
 * Optional `dealPriceByProductId` Map applies live timed-deal prices (server-authoritative).
 */
export function priceOrderFromCatalogue(
  lines,
  products,
  {
    requirePublished = true,
    dealPriceByProductId,
    membershipTier,
    freeDeliveryThreshold,
  } = {}
) {
  const byId = products instanceof Map ? products : productMap(products);
  const priced = [];

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product) {
      return { error: `Unknown product: ${line.productId}`, status: 400 };
    }
    if (requirePublished && !isPublished(product)) {
      return { error: `Product is not available: ${line.productId}`, status: 400 };
    }
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      return { error: "Quantity must be a positive integer", status: 400 };
    }
    const catalogueUnit = cataloguePrice(product);
    if (catalogueUnit == null) {
      return { error: `Invalid catalogue price for ${line.productId}`, status: 400 };
    }
    const dealUnit =
      dealPriceByProductId instanceof Map
        ? asMoneyInteger(dealPriceByProductId.get(line.productId))
        : null;
    const unit =
      dealUnit != null && dealUnit > 0 && dealUnit < catalogueUnit
        ? dealUnit
        : catalogueUnit;
    const stock = catalogueStock(product);
    if (!isListed(product) || stock < line.quantity) {
      return {
        error: `Not enough stock for ${product.title || line.productId}`,
        status: 409,
        productId: line.productId,
      };
    }
    const lineTotal = unit * line.quantity;
    if (!Number.isSafeInteger(lineTotal)) {
      return { error: `Line total is too large for ${line.productId}`, status: 400 };
    }
    priced.push({
      product_id: String(product.id),
      product_title: String(product.title || line.clientTitle || line.productId),
      product_image: product.image ? String(product.image) : line.clientImage || null,
      unit_price: unit,
      quantity: line.quantity,
      line_total: lineTotal,
    });
  }

  const subtotal = priced.reduce((sum, item) => sum + item.line_total, 0);
  if (!Number.isSafeInteger(subtotal)) {
    return { error: "Order total is too large", status: 400 };
  }
  const pricingOpts = { membershipTier, freeDeliveryThreshold };
  const { delivery, total } = calcOrderTotal(subtotal, pricingOpts);
  return {
    items: priced,
    subtotal,
    delivery_fee: delivery,
    total,
    currency: ORDER_CURRENCY,
    membership_tier: membershipTier || "standard",
  };
}

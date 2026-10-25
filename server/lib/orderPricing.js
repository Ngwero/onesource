/**
 * Checkout totals are always computed from the live catalogue.
 * Client unit prices, line totals, and order totals are display-only.
 */

export const DELIVERY_FEE_UGX = 15_000;
export const FREE_DELIVERY_THRESHOLD_UGX = 100_000;

export function calcDeliveryFee(subtotalUgx) {
  return Number(subtotalUgx) >= FREE_DELIVERY_THRESHOLD_UGX ? 0 : DELIVERY_FEE_UGX;
}

export function calcOrderTotal(subtotalUgx) {
  const delivery = calcDeliveryFee(subtotalUgx);
  return { delivery, total: subtotalUgx + delivery };
}

function readProductId(row) {
  return String(row?.productId ?? row?.product_id ?? "").trim();
}

/** Contact + line ids/qty only. Prices on the body are ignored. */
export function parseOrderRequest(body) {
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
    orderType,
    items,
  } = body ?? {};

  if (!email?.trim() || !fullName?.trim() || !addressLine1?.trim() || !city?.trim()) {
    return { error: "Missing required delivery details" };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Order must include at least one item" };
  }
  if (orderType && !["retail", "export"].includes(orderType)) {
    return { error: "Invalid order type" };
  }

  const lines = [];
  for (const row of items) {
    const productId = readProductId(row);
    const qty = Math.floor(Number(row?.quantity));
    if (!productId) {
      return { error: "Invalid line item" };
    }
    if (!Number.isFinite(qty) || qty < 1) {
      return { error: "Quantity must be at least 1" };
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
      user_id: userId || null,
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
  return Number(product.price);
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
 */
export function priceOrderFromCatalogue(lines, products, { requirePublished = true } = {}) {
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
    const unit = cataloguePrice(product);
    if (!Number.isFinite(unit) || unit < 0) {
      return { error: `Invalid catalogue price for ${line.productId}`, status: 400 };
    }
    const stock = catalogueStock(product);
    if (!isListed(product) || stock < line.quantity) {
      return {
        error: `Not enough stock for ${product.title || line.productId}`,
        status: 409,
        productId: line.productId,
      };
    }
    priced.push({
      product_id: String(product.id),
      product_title: String(product.title || line.clientTitle || line.productId),
      product_image: product.image ? String(product.image) : line.clientImage || null,
      unit_price: unit,
      quantity: line.quantity,
      line_total: unit * line.quantity,
    });
  }

  const subtotal = priced.reduce((sum, item) => sum + item.line_total, 0);
  const { delivery, total } = calcOrderTotal(subtotal);
  return {
    items: priced,
    subtotal,
    delivery_fee: delivery,
    total,
  };
}

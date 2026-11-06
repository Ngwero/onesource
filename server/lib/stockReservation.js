/**
 * Reserve catalogue stock so two checkouts cannot both take the last unit.
 * Prefers the optional `reserve_product_stock` RPC (one transaction). If that
 * function is not installed, uses an optimistic `stock_quantity = current`
 * update that still fails the loser when two requests race.
 *
 * Checkout holds: reserve at checkout start with a ~10 minute expiry. Holds are
 * tracked in `stock_reservations` when available, otherwise in process memory.
 * Application-level expiry runs before every hold/create even without the RPC.
 */

import { randomUUID } from "node:crypto";

export const DEFAULT_HOLD_TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, { items: {product_id:string,quantity:number}[], expiresAt:number, status:string, via:string }>} */
const memoryHolds = new Map();

function isMissingRpc(error) {
  const code = String(error?.code ?? "");
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return (
    code === "PGRST202" ||
    code === "42883" ||
    msg.includes("could not find the function") ||
    (msg.includes("reserve_product_stock") &&
      (msg.includes("does not exist") || msg.includes("schema cache")))
  );
}

function isMissingReservationsTable(error) {
  const code = String(error?.code ?? "");
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (msg.includes("stock_reservations") &&
      (msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("could not find")))
  );
}

function rpcItems(items) {
  return items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
  }));
}

function normalizeHoldItems(items) {
  const merged = new Map();
  for (const item of items ?? []) {
    const product_id = String(item.product_id ?? item.productId ?? "").trim();
    const quantity = Math.floor(Number(item.quantity));
    if (!product_id || !Number.isSafeInteger(quantity) || quantity < 1) continue;
    merged.set(product_id, (merged.get(product_id) ?? 0) + quantity);
  }
  return [...merged.entries()]
    .map(([product_id, quantity]) => ({ product_id, quantity }))
    .sort((a, b) => a.product_id.localeCompare(b.product_id));
}

function sameItems(a, b) {
  const left = normalizeHoldItems(a);
  const right = normalizeHoldItems(b);
  if (left.length !== right.length) return false;
  return left.every(
    (item, i) =>
      item.product_id === right[i].product_id && item.quantity === right[i].quantity
  );
}

async function reserveViaRpc(db, items) {
  const { data, error } = await db.rpc("reserve_product_stock", {
    p_items: rpcItems(items),
  });
  if (error) return { error };
  const failed = Array.isArray(data)
    ? data.find((row) => row && row.ok === false)
    : data?.ok === false
      ? data
      : null;
  if (failed) {
    return {
      ok: false,
      error: `Not enough stock for ${failed.product_id || "item"}`,
      productId: failed.product_id,
    };
  }
  return {
    ok: true,
    reserved: items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    via: "rpc",
  };
}

async function releaseViaRpc(db, reserved) {
  const { error } = await db.rpc("release_product_stock", {
    p_items: rpcItems(reserved),
  });
  if (error && !isMissingRpc(error)) throw error;
  return !error;
}

async function reserveOneOptimistic(db, item, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { data: row, error } = await db
      .from("products")
      .select("id, stock_quantity, in_stock")
      .eq("id", item.product_id)
      .maybeSingle();
    if (error) throw error;
    const current = Math.floor(Number(row?.stock_quantity ?? 0));
    if (!row || row.in_stock === false || current < item.quantity) {
      return { ok: false, error: `Not enough stock for ${item.product_id}` };
    }
    const next = current - item.quantity;
    const { data: updated, error: updateError } = await db
      .from("products")
      .update({
        stock_quantity: next,
        in_stock: next > 0,
      })
      .eq("id", item.product_id)
      .eq("stock_quantity", current)
      .eq("in_stock", true)
      .gte("stock_quantity", item.quantity)
      .select("id, stock_quantity")
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) return { ok: true, previous: current };
  }
  return { ok: false, error: `Could not reserve stock for ${item.product_id}` };
}

async function reserveOptimistic(db, items) {
  const reserved = [];
  try {
    for (const item of items) {
      const result = await reserveOneOptimistic(db, item);
      if (!result.ok) {
        throw Object.assign(new Error(result.error), {
          stockFailure: true,
          productId: item.product_id,
        });
      }
      reserved.push({
        product_id: item.product_id,
        quantity: item.quantity,
        previous: result.previous,
      });
    }
    return { ok: true, reserved, via: "optimistic" };
  } catch (error) {
    await releaseOptimistic(db, reserved);
    if (error.stockFailure) {
      return { ok: false, error: error.message, productId: error.productId };
    }
    throw error;
  }
}

async function releaseOptimistic(db, reserved) {
  for (const item of reserved) {
    let restored = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: row, error } = await db
        .from("products")
        .select("stock_quantity,in_stock")
        .eq("id", item.product_id)
        .maybeSingle();
      if (error) throw error;
      if (!row) throw new Error(`Cannot restore stock for ${item.product_id}`);
      const current = Number(row.stock_quantity);
      const { data, error: updateError } = await db
        .from("products")
        .update({
          stock_quantity: current + item.quantity,
          in_stock: current === 0 || row.in_stock,
        })
        .eq("id", item.product_id)
        .eq("stock_quantity", current)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (data) {
        restored = true;
        break;
      }
    }
    if (!restored) throw new Error(`Could not restore stock for ${item.product_id}`);
  }
}

export async function reserveStock(db, items) {
  if (!items?.length) return { ok: true, reserved: [], via: "none" };

  items = normalizeHoldItems(items);
  const rpc = await reserveViaRpc(db, items);
  if (typeof rpc.ok === "boolean") return rpc;
  if (!isMissingRpc(rpc.error)) {
    const msg = String(rpc.error.message ?? "");
    const stockMatch = msg.match(/insufficient_stock:(\S+)/);
    if (stockMatch) {
      return {
        ok: false,
        error: `Not enough stock for ${stockMatch[1]}`,
        productId: stockMatch[1],
      };
    }
    throw rpc.error;
  }
  return reserveOptimistic(db, items);
}

export async function releaseStock(db, reserved, { via } = {}) {
  if (!reserved?.length) return;
  if (via === "rpc") {
    const released = await releaseViaRpc(db, reserved);
    if (released) return;
  }
  await releaseOptimistic(db, reserved);
}

async function markReleased(db, id) {
  memoryHolds.delete(id);
  try {
    await db
      .from("stock_reservations")
      .update({ status: "released", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "held");
  } catch (error) {
    if (!isMissingReservationsTable(error)) throw error;
  }
}

async function releaseHoldRecord(db, hold) {
  if (!hold || hold.status !== "held") return;
  await releaseStock(db, hold.items, { via: hold.via });
  await markReleased(db, hold.id);
}

/** Sweep expired holds and put stock back. Safe to call often. */
export async function releaseExpiredReservations(db, { now = Date.now() } = {}) {
  const expired = [];

  for (const [id, hold] of memoryHolds) {
    if (hold.status === "held" && hold.expiresAt <= now) {
      expired.push({ id, items: hold.items, via: hold.via, status: "held" });
    }
  }

  try {
    const { data, error } = await db
      .from("stock_reservations")
      .select("id, items, expires_at, status")
      .eq("status", "held")
      .lte("expires_at", new Date(now).toISOString())
      .limit(100);
    if (error) {
      if (!isMissingReservationsTable(error)) throw error;
    } else {
      for (const row of data ?? []) {
        if (expired.some((h) => h.id === row.id)) continue;
        expired.push({
          id: row.id,
          items: normalizeHoldItems(row.items),
          via: "optimistic",
          status: "held",
        });
      }
    }
  } catch (error) {
    if (!isMissingReservationsTable(error)) throw error;
  }

  for (const hold of expired) {
    await releaseHoldRecord(db, hold);
  }
  return expired.length;
}

async function persistHold(db, { id, items, expiresAt, via }) {
  memoryHolds.set(id, {
    items,
    expiresAt: expiresAt.getTime(),
    status: "held",
    via,
  });
  try {
    const { error } = await db.from("stock_reservations").insert({
      id,
      status: "held",
      items,
      expires_at: expiresAt.toISOString(),
    });
    if (error && !isMissingReservationsTable(error)) throw error;
  } catch (error) {
    if (!isMissingReservationsTable(error)) throw error;
  }
}

async function loadHold(db, id) {
  const mem = memoryHolds.get(id);
  if (mem) {
    return {
      id,
      items: mem.items,
      expiresAt: mem.expiresAt,
      status: mem.status,
      via: mem.via,
    };
  }
  try {
    const { data, error } = await db
      .from("stock_reservations")
      .select("id, items, expires_at, status")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isMissingReservationsTable(error)) return null;
      throw error;
    }
    if (!data) return null;
    return {
      id: data.id,
      items: normalizeHoldItems(data.items),
      expiresAt: new Date(data.expires_at).getTime(),
      status: data.status,
      via: "optimistic",
    };
  } catch (error) {
    if (isMissingReservationsTable(error)) return null;
    throw error;
  }
}

/**
 * Reserve stock for checkout start. Returns a reservation id the client should
 * send back when placing the order.
 */
export async function holdCheckoutStock(
  db,
  items,
  { ttlMs = DEFAULT_HOLD_TTL_MS, now = Date.now() } = {}
) {
  await releaseExpiredReservations(db, { now });
  const normalized = normalizeHoldItems(items);
  if (!normalized.length) {
    return { ok: false, error: "Nothing to reserve" };
  }
  const reserved = await reserveStock(db, normalized);
  if (!reserved.ok) return reserved;

  const id = randomUUID();
  const expiresAt = new Date(now + ttlMs);
  try {
    await persistHold(db, {
      id,
      items: reserved.reserved.map(({ product_id, quantity }) => ({
        product_id,
        quantity,
      })),
      expiresAt,
      via: reserved.via,
    });
  } catch (error) {
    await releaseStock(db, reserved.reserved, { via: reserved.via });
    throw error;
  }

  return {
    ok: true,
    reservationId: id,
    expiresAt: expiresAt.toISOString(),
    expiresInMs: ttlMs,
    reserved: reserved.reserved,
    via: reserved.via,
  };
}

/** Abandon checkout: release held units early. */
export async function releaseCheckoutHold(db, reservationId, { now = Date.now() } = {}) {
  await releaseExpiredReservations(db, { now });
  if (!reservationId) return { ok: true };
  const hold = await loadHold(db, reservationId);
  if (!hold || hold.status !== "held") return { ok: true };
  await releaseHoldRecord(db, hold);
  return { ok: true };
}

/**
 * Convert a valid hold into an order (stock already deducted), or reserve fresh
 * when no hold is supplied. Returns { ok, reserved, via, reservationId?, consumedHold }.
 */
export async function claimStockForOrder(
  db,
  items,
  { reservationId, now = Date.now() } = {}
) {
  await releaseExpiredReservations(db, { now });
  const normalized = normalizeHoldItems(items);

  if (reservationId) {
    const hold = await loadHold(db, reservationId);
    if (!hold || hold.status !== "held") {
      return { ok: false, error: "Checkout reservation expired or missing", status: 409 };
    }
    if (hold.expiresAt <= now) {
      await releaseHoldRecord(db, hold);
      return { ok: false, error: "Checkout reservation expired", status: 409 };
    }
    if (!sameItems(hold.items, normalized)) {
      return {
        ok: false,
        error: "Checkout reservation does not match basket items",
        status: 409,
      };
    }
    return {
      ok: true,
      reserved: hold.items,
      via: hold.via,
      reservationId,
      consumedHold: true,
    };
  }

  const reserved = await reserveStock(db, normalized);
  if (!reserved.ok) return { ...reserved, status: 409 };
  return {
    ok: true,
    reserved: reserved.reserved,
    via: reserved.via,
    consumedHold: false,
  };
}

export async function markHoldConverted(db, reservationId, orderId) {
  if (!reservationId) return;
  const mem = memoryHolds.get(reservationId);
  if (mem) mem.status = "converted";
  try {
    const { error } = await db
      .from("stock_reservations")
      .update({
        status: "converted",
        order_id: orderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservationId)
      .eq("status", "held");
    if (error && !isMissingReservationsTable(error)) throw error;
  } catch (error) {
    if (!isMissingReservationsTable(error)) throw error;
  }
}

/** After a failed order insert that had already consumed a hold, put stock back. */
export async function rollbackClaimedStock(db, claim) {
  if (!claim?.ok || !claim.reserved?.length) return;
  await releaseStock(db, claim.reserved, { via: claim.via });
  if (claim.reservationId) await markReleased(db, claim.reservationId);
}

/** Test helper — clear process-local holds between unit tests. */
export function _resetMemoryHoldsForTests() {
  memoryHolds.clear();
}

/**
 * Idempotency for POST /api/orders.
 * Same key + same fingerprint → replay the stored response.
 * Same key + different fingerprint → 409.
 * Falls back to an in-memory map when the optional table is missing.
 */

import { createHash } from "node:crypto";

const memory = new Map();
const MEMORY_TTL_MS = 24 * 60 * 60 * 1000;

function isMissingTable(error) {
  const code = String(error?.code ?? "");
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("order_idempotency") &&
      (msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("could not find"))
  );
}

export function readIdempotencyKey(req) {
  const header =
    req.get?.("idempotency-key") ||
    req.headers?.["idempotency-key"] ||
    req.headers?.["Idempotency-Key"];
  const bodyKey = req.body?.idempotencyKey ?? req.body?.idempotency_key;
  const raw = String(header || bodyKey || "").trim();
  if (!raw || raw.length > 128) return null;
  if (!/^[\w.:\-]+$/u.test(raw)) return null;
  return raw;
}

/** Stable hash of the parts that define "the same order". */
export function orderRequestFingerprint({ contact, lines }) {
  const payload = {
    email: contact.email,
    full_name: contact.full_name,
    phone: contact.phone ?? null,
    address_line1: contact.address_line1,
    address_line2: contact.address_line2 ?? null,
    city: contact.city,
    district: contact.district ?? null,
    notes: contact.notes ?? null,
    orderType: contact.orderType ?? "retail",
    items: [...lines]
      .map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function memoryGet(key) {
  const row = memory.get(key);
  if (!row) return null;
  if (Date.now() - row.storedAt > MEMORY_TTL_MS) {
    memory.delete(key);
    return null;
  }
  return row;
}

function memorySet(key, fingerprint, responseStatus, responseBody, orderId) {
  memory.set(key, {
    fingerprint,
    responseStatus,
    responseBody,
    orderId,
    storedAt: Date.now(),
  });
}

export async function lookupIdempotency(db, key) {
  if (!key) return null;
  try {
    const { data, error } = await db
      .from("order_idempotency")
      .select("key, request_hash, order_id, response_status, response_body")
      .eq("key", key)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return memoryGet(key);
      throw error;
    }
    if (!data) return memoryGet(key);
    return {
      fingerprint: data.request_hash,
      responseStatus: data.response_status,
      responseBody: data.response_body,
      orderId: data.order_id,
      via: "db",
    };
  } catch (error) {
    if (isMissingTable(error)) return memoryGet(key);
    throw error;
  }
}

export async function persistIdempotency(
  db,
  { key, fingerprint, orderId, responseStatus, responseBody }
) {
  if (!key) return;
  memorySet(key, fingerprint, responseStatus, responseBody, orderId);
  try {
    const query = db.from("order_idempotency");
    if (typeof query?.upsert !== "function") return;
    const { error } = await query.upsert(
      {
        key,
        request_hash: fingerprint,
        order_id: orderId,
        response_status: responseStatus,
        response_body: responseBody,
      },
      { onConflict: "key" }
    );
    if (error && !isMissingTable(error)) throw error;
  } catch (error) {
    if (!isMissingTable(error)) throw error;
  }
}

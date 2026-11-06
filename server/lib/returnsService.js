import { isMissingTable, tableExists } from "./tableDetect.js";

export const RETURNS_SETUP_HINT =
  "Run server/supabase/returns.sql. Photos: images bucket path returns/{orderId}/{uuid}.webp";

const STATUSES = new Set(["requested", "approved", "rejected", "received"]);

export async function createReturnRequest(db, {
  orderId,
  orderItemId,
  userId,
  productId,
  reason,
  photoPath,
}) {
  if (!(await tableExists(db, "return_requests"))) {
    return { missing: true };
  }
  const { data, error } = await db
    .from("return_requests")
    .insert({
      order_id: orderId,
      order_item_id: orderItemId || null,
      user_id: userId || null,
      product_id: productId || null,
      reason: String(reason || "").trim().slice(0, 2000),
      photo_path: photoPath || null,
      status: "requested",
    })
    .select("*")
    .single();
  if (error) {
    if (isMissingTable(error)) return { missing: true };
    throw error;
  }
  return { missing: false, returnRequest: mapReturn(data) };
}

export async function listReturnsForOrder(db, orderId, userId) {
  if (!(await tableExists(db, "return_requests"))) {
    return { missing: true, returns: [] };
  }
  let q = db.from("return_requests").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) return { missing: true, returns: [] };
    throw error;
  }
  return { missing: false, returns: (data ?? []).map(mapReturn) };
}

export async function listReturnsAdmin(db, { limit = 50 } = {}) {
  if (!(await tableExists(db, "return_requests"))) {
    return { missing: true, returns: [] };
  }
  const { data, error } = await db
    .from("return_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 200));
  if (error) {
    if (isMissingTable(error)) return { missing: true, returns: [] };
    throw error;
  }
  return { missing: false, returns: (data ?? []).map(mapReturn) };
}

export async function updateReturnStatus(db, id, status, adminNoteOrOpts) {
  const adminNote =
    adminNoteOrOpts && typeof adminNoteOrOpts === "object"
      ? adminNoteOrOpts.adminNote
      : adminNoteOrOpts;
  if (!STATUSES.has(status)) throw new Error("Invalid return status");
  if (!(await tableExists(db, "return_requests"))) return { missing: true };
  const patch = { status, updated_at: new Date().toISOString() };
  if (adminNote != null) patch.admin_note = String(adminNote).slice(0, 2000);
  const { data, error } = await db
    .from("return_requests")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return { missing: false, returnRequest: data ? mapReturn(data) : null };
}

function mapReturn(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    orderItemId: row.order_item_id,
    userId: row.user_id,
    productId: row.product_id,
    reason: row.reason,
    photoPath: row.photo_path,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

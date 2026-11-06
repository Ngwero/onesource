import { isMissingTable, tableExists } from "./tableDetect.js";

export const SUPPORT_SETUP_HINT =
  "Run server/supabase/support-chat.sql for order-linked support threads.";

export async function listThreadsForUser(db, userId) {
  if (!(await tableExists(db, "support_threads"))) {
    return { missing: true, threads: [] };
  }
  const { data, error } = await db
    .from("support_threads")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return { missing: true, threads: [] };
    throw error;
  }
  return { missing: false, threads: (data ?? []).map(mapThread) };
}

export async function listAllThreadsAdmin(db, { limit = 50 } = {}) {
  if (!(await tableExists(db, "support_threads"))) {
    return { missing: true, threads: [] };
  }
  const { data, error } = await db
    .from("support_threads")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingTable(error)) return { missing: true, threads: [] };
    throw error;
  }
  return { missing: false, threads: (data ?? []).map(mapThread) };
}

/** Alias used by /api/admin/support */
export const listThreadsAdmin = listAllThreadsAdmin;

export async function getThreadAdmin(db, threadId) {
  if (!(await tableExists(db, "support_threads"))) {
    return null;
  }
  const { data, error } = await db
    .from("support_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  if (!data) return null;
  const messages = await listMessages(db, threadId);
  return { ...mapThread(data), messages: messages.messages };
}

export async function addMessage(db, { threadId, senderId, senderRole, body }) {
  const role =
    senderRole === "admin" || senderRole === "support" ? "support" : "customer";
  return postMessage(db, {
    threadId,
    senderRole: role,
    senderUserId: senderId,
    body,
  });
}

export async function getOrCreateThread(db, { userId, orderId, subject }) {
  if (!(await tableExists(db, "support_threads"))) {
    return { missing: true };
  }
  if (orderId) {
    const { data: existing } = await db
      .from("support_threads")
      .select("*")
      .eq("user_id", userId)
      .eq("order_id", orderId)
      .eq("status", "open")
      .maybeSingle();
    if (existing) return { missing: false, thread: mapThread(existing) };
  }
  const { data, error } = await db
    .from("support_threads")
    .insert({
      user_id: userId,
      order_id: orderId || null,
      subject: String(subject || "Order help").slice(0, 200),
    })
    .select("*")
    .single();
  if (error) throw error;
  return { missing: false, thread: mapThread(data) };
}

export async function listMessages(db, threadId) {
  if (!(await tableExists(db, "support_messages"))) {
    return { missing: true, messages: [] };
  }
  const { data, error } = await db
    .from("support_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return { missing: true, messages: [] };
    throw error;
  }
  return { missing: false, messages: (data ?? []).map(mapMessage) };
}

export async function postMessage(db, { threadId, senderRole, senderUserId, body }) {
  if (!(await tableExists(db, "support_messages"))) {
    return { missing: true };
  }
  const text = String(body || "").trim().slice(0, 4000);
  if (!text) throw new Error("Message body required");
  const { data, error } = await db
    .from("support_messages")
    .insert({
      thread_id: threadId,
      sender_role: senderRole,
      sender_user_id: senderUserId || null,
      body: text,
    })
    .select("*")
    .single();
  if (error) throw error;
  await db.from("support_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
  return { missing: false, message: mapMessage(data) };
}

function mapThread(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderRole: row.sender_role,
    senderUserId: row.sender_user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

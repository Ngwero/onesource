import { isMissingTable, tableExists } from "./tableDetect.js";
import { enqueueUserNotification } from "./pushNotificationService.js";

export const SUBSCRIPTIONS_SETUP_HINT =
  "Run server/supabase/subscriptions.sql. Tick via POST /api/internal/run-subscription-ticks";

export async function listSubscriptions(db, userId) {
  if (!(await tableExists(db, "subscriptions"))) {
    return { missing: true, subscriptions: [] };
  }
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("next_run", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return { missing: true, subscriptions: [] };
    throw error;
  }
  return { missing: false, subscriptions: (data ?? []).map(mapSub) };
}

export async function createSubscription(db, {
  userId,
  productId,
  quantity = 1,
  intervalDays = 14,
  sourceOrderId,
}) {
  if (!(await tableExists(db, "subscriptions"))) return { missing: true };
  const interval = Math.min(365, Math.max(1, Number(intervalDays) || 14));
  const next = new Date(Date.now() + interval * 86400000);
  const { data, error } = await db
    .from("subscriptions")
    .insert({
      user_id: userId,
      product_id: String(productId),
      quantity: Math.min(100, Math.max(1, Number(quantity) || 1)),
      interval_days: interval,
      next_run: next.toISOString(),
      source_order_id: sourceOrderId || null,
      active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { missing: false, subscription: mapSub(data) };
}

export async function setSubscriptionActive(db, userId, id, active) {
  if (!(await tableExists(db, "subscriptions"))) return { missing: true };
  const { data, error } = await db
    .from("subscriptions")
    .update({ active: Boolean(active) })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return { missing: false, notFound: true };
  return { missing: false, subscription: mapSub(data) };
}

/** Due reminders — no payment. Advances next_run and enqueues inbox notification. */
export async function runSubscriptionTicks(db, { now = new Date(), limit = 50 } = {}) {
  if (!(await tableExists(db, "subscriptions"))) {
    return { missing: true, reminded: 0 };
  }
  const iso = (now instanceof Date ? now : new Date(now)).toISOString();
  const { data: due, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("active", true)
    .lte("next_run", iso)
    .limit(limit);
  if (error) {
    if (isMissingTable(error)) return { missing: true, reminded: 0 };
    throw error;
  }

  let reminded = 0;
  for (const row of due ?? []) {
    const interval = Math.max(1, Number(row.interval_days) || 14);
    const next = new Date(Math.max(Date.now(), new Date(row.next_run).getTime()) + interval * 86400000);
    await db
      .from("subscriptions")
      .update({
        next_run: next.toISOString(),
        last_reminded_at: iso,
      })
      .eq("id", row.id);

    await enqueueUserNotification(db, {
      userId: row.user_id,
      topic: "subscription_reminder",
      title: "Time to reorder",
      body: `Your scheduled item (${row.product_id}) is due. Open the app to add it to your basket — nothing was charged.`,
      href: `/product/${encodeURIComponent(row.product_id)}`,
    });
    reminded += 1;
  }
  return { missing: false, reminded };
}

function mapSub(row) {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quantity: row.quantity,
    intervalDays: row.interval_days,
    nextRun: row.next_run,
    active: row.active !== false,
    lastRemindedAt: row.last_reminded_at,
    sourceOrderId: row.source_order_id,
    createdAt: row.created_at,
  };
}

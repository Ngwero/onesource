import { isMissingTable, tableExists } from "./tableDetect.js";
import { logInfo, logWarn } from "./requestLog.js";

export const PUSH_SETUP_HINT =
  "Run server/supabase/push-notifications.sql. Optional: FCM_SERVER_KEY or APNS_* for remote push.";

const TOPIC_DEFAULTS = ["order_status"];

/** Store inbox row; attempt FCM/APNs when env present and user opted in. */
export async function enqueueUserNotification(db, {
  userId,
  topic = "general",
  title,
  body = "",
  href = "",
}) {
  if (!userId || !title) return { ok: false };
  if (!(await tableExists(db, "user_notifications"))) {
    return { ok: false, missing: true };
  }

  const { data, error } = await db
    .from("user_notifications")
    .insert({
      user_id: userId,
      topic: String(topic).slice(0, 64),
      title: String(title).slice(0, 200),
      body: String(body).slice(0, 1000),
      href: String(href).slice(0, 500),
    })
    .select("*")
    .single();
  if (error) {
    if (isMissingTable(error)) return { ok: false, missing: true };
    throw error;
  }

  const pushed = await trySendPush(db, userId, topic, title, body, href);
  if (pushed) {
    await db
      .from("user_notifications")
      .update({ pushed_at: new Date().toISOString() })
      .eq("id", data.id);
  }
  return { ok: true, notification: mapNotif(data), pushed };
}

export async function listUserInbox(db, userId, { limit = 40 } = {}) {
  if (!(await tableExists(db, "user_notifications"))) {
    return { missing: true, items: [] };
  }
  const { data, error } = await db
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingTable(error)) return { missing: true, items: [] };
    throw error;
  }
  return { missing: false, items: (data ?? []).map(mapNotif) };
}

export async function upsertPushToken(db, {
  userId,
  platform,
  token,
  optIn = true,
  topics = TOPIC_DEFAULTS,
}) {
  if (!(await tableExists(db, "user_push_tokens"))) {
    return { missing: true };
  }
  const { data, error } = await db
    .from("user_push_tokens")
    .upsert(
      {
        user_id: userId,
        platform: ["ios", "android", "web"].includes(platform) ? platform : "android",
        token: String(token).slice(0, 512),
        opt_in: Boolean(optIn),
        topics: Array.isArray(topics) ? topics.map(String).slice(0, 10) : TOPIC_DEFAULTS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return { missing: false, token: data };
}

async function trySendPush(db, userId, topic, title, body, href) {
  const fcmKey = process.env.FCM_SERVER_KEY?.trim();
  if (!fcmKey) {
    logInfo("push", "stored inbox only (no FCM_SERVER_KEY)", { userId, topic });
    return false;
  }
  if (!(await tableExists(db, "user_push_tokens"))) return false;

  const { data: tokens } = await db
    .from("user_push_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("opt_in", true);

  const eligible = (tokens ?? []).filter((t) => {
    const topics = t.topics || [];
    return !topics.length || topics.includes(topic) || topics.includes("all");
  });
  if (!eligible.length) return false;

  let any = false;
  for (const row of eligible) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${fcmKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: row.token,
          notification: { title, body },
          data: { href: href || "", topic },
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) any = true;
      else logWarn("push", "FCM non-OK", { status: res.status });
    } catch (e) {
      logWarn("push", "FCM send failed", { error: e.message });
    }
  }
  return any;
}

function mapNotif(row) {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    pushedAt: row.pushed_at,
    createdAt: row.created_at,
  };
}

/** Notify wishlist owners when a watched product is back / cheaper (opt-in topics). */
export async function notifyWishlistPriceOrStock(db, {
  productId,
  title,
  kind, // 'back_in_stock' | 'price_drop'
  href,
}) {
  if (!(await tableExists(db, "wishlist_items"))) return { notified: 0 };
  const { data: items } = await db
    .from("wishlist_items")
    .select("wishlist_id")
    .eq("product_id", String(productId))
    .limit(100);
  if (!items?.length) return { notified: 0 };

  const wishlistIds = [...new Set(items.map((i) => i.wishlist_id))];
  const { data: lists } = await db
    .from("wishlists")
    .select("user_id")
    .in("id", wishlistIds);
  const userIds = [...new Set((lists ?? []).map((l) => l.user_id).filter(Boolean))];

  let notified = 0;
  for (const userId of userIds.slice(0, 50)) {
    await enqueueUserNotification(db, {
      userId,
      topic: kind,
      title: kind === "price_drop" ? "Price drop on a saved item" : "Back in stock",
      body: title || productId,
      href: href || `/product/${encodeURIComponent(productId)}`,
    });
    notified += 1;
  }
  return { notified };
}

/**
 * Push notification plumbing. Logs when APNs/FCM credentials are absent.
 * Does not throw on missing keys — hooks stay safe in checkout/status paths.
 */

function isMissing(error) {
  const code = error?.code || error?.cause?.code;
  const msg = String(error?.message || "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || msg.includes("does not exist");
}

export function pushProvidersConfigured(env = process.env) {
  return {
    apns: Boolean(env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_BUNDLE_ID && env.APNS_PRIVATE_KEY),
    fcm: Boolean(env.FCM_SERVER_KEY || env.FIREBASE_SERVICE_ACCOUNT_JSON),
    webPush: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ userId: string, platform: string, token: string, webEndpoint?: string }} input
 */
export async function registerDeviceToken(db, input) {
  const userId = String(input.userId || "").trim();
  const platform = String(input.platform || "").trim().toLowerCase();
  const token = String(input.token || "").trim();
  if (!userId || !token) throw new Error("userId and token are required");
  if (!["ios", "android", "web"].includes(platform)) {
    throw new Error("platform must be ios, android, or web");
  }

  const row = {
    user_id: userId,
    platform,
    token,
    web_endpoint: input.webEndpoint ? String(input.webEndpoint) : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("device_tokens")
    .upsert(row, { onConflict: "user_id,token" })
    .select("*")
    .maybeSingle();
  if (error) {
    if (isMissing(error)) {
      const err = new Error("device_tokens table not installed");
      err.code = "MISSING_TABLE";
      throw err;
    }
    throw error;
  }
  return data;
}

/**
 * Stub send — resolves tokens and logs. Real APNs/FCM/web-push go here later.
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ userId?: string, title: string, body: string, data?: Record<string, string> }} payload
 */
export async function sendPushToUser(db, payload) {
  const providers = pushProvidersConfigured();
  const hasProvider = providers.apns || providers.fcm || providers.webPush;
  let tokens = [];
  try {
    if (payload.userId) {
      const { data, error } = await db
        .from("device_tokens")
        .select("id, platform, token")
        .eq("user_id", payload.userId)
        .limit(50);
      if (error) {
        if (isMissing(error)) {
          console.info("[push] skip — device_tokens missing");
          return { sent: 0, skipped: true, reason: "missing_table" };
        }
        throw error;
      }
      tokens = data ?? [];
    }
  } catch (e) {
    console.warn("[push] token lookup failed:", e.message || e);
    return { sent: 0, skipped: true, reason: "lookup_failed" };
  }

  if (!tokens.length) {
    console.info("[push] no device tokens for user", payload.userId || "(none)");
    return { sent: 0, skipped: true, reason: "no_tokens" };
  }

  if (!hasProvider) {
    console.info(
      `[push] would notify ${tokens.length} device(s): "${payload.title}" — ${payload.body} (no APNs/FCM/VAPID keys)`
    );
    return { sent: 0, skipped: true, reason: "no_provider", tokenCount: tokens.length };
  }

  // Provider SDKs intentionally not wired yet — keep hook stable.
  console.info(
    `[push] providers configured; stub send to ${tokens.length} device(s): "${payload.title}"`
  );
  return { sent: 0, skipped: true, reason: "stub", tokenCount: tokens.length, providers };
}

/** Order-status change hook. */
export async function notifyOrderStatusChange(db, order) {
  if (!order?.user_id) return { sent: 0, skipped: true, reason: "guest_order" };
  return sendPushToUser(db, {
    userId: order.user_id,
    title: "Order update",
    body: `Your order is now ${order.status}.`,
    data: { orderId: String(order.id), status: String(order.status), type: "order_status" },
  });
}

/** Back-in-stock hook stub. */
export async function notifyBackInStock(db, { userId, productId, title }) {
  return sendPushToUser(db, {
    userId,
    title: "Back in stock",
    body: title ? `${title} is available again.` : "An item on your list is back in stock.",
    data: { productId: String(productId || ""), type: "back_in_stock" },
  });
}

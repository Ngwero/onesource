/**
 * Verified-purchase product reviews. No fake seeds.
 * Falls back gracefully when the product_reviews table is not installed.
 */

function isMissingReviewsTable(error) {
  const code = String(error?.code ?? "");
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (msg.includes("product_reviews") &&
      (msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("could not find")))
  );
}

const COMPLETED_STATUSES = new Set(["delivered"]);

export async function listApprovedReviews(db, productId, { limit = 20 } = {}) {
  try {
    const { data, error } = await db
      .from("product_reviews")
      .select(
        "id, product_id, rating, title, body, verified_purchase, created_at, moderation_status"
      )
      .eq("product_id", productId)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(Math.min(50, Math.max(1, limit)));
    if (error) {
      if (isMissingReviewsTable(error)) return [];
      throw error;
    }
    return data ?? [];
  } catch (error) {
    if (isMissingReviewsTable(error)) return [];
    throw error;
  }
}

/**
 * Whether the signed-in user can review this product (delivered order containing it).
 */
export async function getReviewEligibility(db, productId, userId) {
  if (!userId) {
    return { eligible: false, reason: "sign_in", orderId: null };
  }
  try {
    const { data: orders, error } = await db
      .from("orders")
      .select("id, status, order_items(product_id)")
      .eq("user_id", userId)
      .eq("status", "delivered")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;

    const matching = (orders ?? []).filter((order) =>
      (order.order_items ?? []).some((item) => String(item.product_id) === String(productId))
    );
    if (!matching.length) {
      return { eligible: false, reason: "no_purchase", orderId: null };
    }

    const orderIds = matching.map((o) => o.id);
    const { data: existing, error: existingErr } = await db
      .from("product_reviews")
      .select("order_id")
      .eq("product_id", productId)
      .eq("user_id", userId)
      .in("order_id", orderIds);
    if (existingErr) {
      if (isMissingReviewsTable(existingErr)) {
        return { eligible: false, reason: "unavailable", orderId: null };
      }
      throw existingErr;
    }
    const reviewed = new Set((existing ?? []).map((row) => row.order_id));
    const open = matching.find((order) => !reviewed.has(order.id));
    if (!open) {
      return { eligible: false, reason: "already_reviewed", orderId: null };
    }
    return { eligible: true, reason: null, orderId: open.id };
  } catch (error) {
    if (isMissingReviewsTable(error)) {
      return { eligible: false, reason: "unavailable", orderId: null };
    }
    throw error;
  }
}

async function refreshProductRating(db, productId) {
  try {
    await db.rpc("refresh_product_rating", { p_product_id: productId });
  } catch {
    // RPC may be missing until owner pastes SQL — listing still works.
  }
}

/**
 * Create a review only when the caller owns a delivered order containing the product.
 * Verified purchases are approved immediately (moderation_status remains available for later rejection).
 */
export async function createVerifiedReview(
  db,
  {
    productId,
    orderId,
    userId,
    rating,
    title,
    body,
  }
) {
  const stars = Math.floor(Number(rating));
  const text = String(body ?? "").trim();
  if (!productId || !orderId || !userId) {
    return { error: "productId, orderId and authentication are required", status: 400 };
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { error: "rating must be 1–5", status: 400 };
  }
  if (text.length < 1 || text.length > 4000) {
    return { error: "Review text is required", status: 400 };
  }

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id, user_id, status, order_items(product_id)")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) throw orderErr;
  if (!order || order.user_id !== userId) {
    return { error: "Order not found", status: 404 };
  }
  if (!COMPLETED_STATUSES.has(order.status)) {
    return { error: "Only delivered orders can be reviewed", status: 400 };
  }
  const purchased = (order.order_items ?? []).some(
    (item) => String(item.product_id) === String(productId)
  );
  if (!purchased) {
    return { error: "Product was not on this order", status: 400 };
  }

  try {
    const { data, error } = await db
      .from("product_reviews")
      .insert({
        product_id: productId,
        order_id: orderId,
        user_id: userId,
        rating: stars,
        title: title ? String(title).trim().slice(0, 200) : null,
        body: text,
        verified_purchase: true,
        moderation_status: "approved",
      })
      .select(
        "id, product_id, rating, title, body, verified_purchase, moderation_status, created_at"
      )
      .single();
    if (error) {
      if (isMissingReviewsTable(error)) {
        return { error: "Reviews are not enabled yet", status: 503 };
      }
      if (String(error.code) === "23505") {
        return { error: "You already reviewed this product for that order", status: 409 };
      }
      throw error;
    }
    await refreshProductRating(db, productId);
    return { review: data };
  } catch (error) {
    if (isMissingReviewsTable(error)) {
      return { error: "Reviews are not enabled yet", status: 503 };
    }
    throw error;
  }
}

/** @deprecated Prefer recommendationsService.alsoBoughtProductIds */
export { alsoBoughtProductIds } from "./recommendationsService.js";

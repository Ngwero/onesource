/**
 * Membership tiers drive free-delivery threshold and member-only deals.
 * App degrades to standard tier when memberships table / column is missing.
 */

import {
  DELIVERY_FEE_UGX,
  FREE_DELIVERY_THRESHOLD_UGX,
} from "./orderPricing.js";

export const MEMBER_FREE_DELIVERY_THRESHOLD_UGX = Number(
  process.env.MEMBER_FREE_DELIVERY_THRESHOLD_UGX || 50_000
);

export const MEMBERSHIP_TIERS = ["standard", "member"];

export function freeDeliveryThresholdForTier(tier) {
  if (tier && tier !== "standard" && tier !== "none") {
    return MEMBER_FREE_DELIVERY_THRESHOLD_UGX;
  }
  return FREE_DELIVERY_THRESHOLD_UGX;
}

export function calcDeliveryFeeForTier(subtotalUgx, tier = "standard") {
  const subtotal = Math.max(0, Math.floor(Number(subtotalUgx) || 0));
  const threshold = freeDeliveryThresholdForTier(tier);
  return subtotal >= threshold ? 0 : DELIVERY_FEE_UGX;
}

function isMissing(error) {
  const code = error?.code || error?.cause?.code;
  const msg = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find")
  );
}

/**
 * Resolve membership tier for a user id. Returns "standard" when unknown.
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string|null|undefined} userId
 */
export async function getMembershipTier(db, userId) {
  if (!userId) {
    return {
      tier: "standard",
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD_UGX,
      deliveryFee: DELIVERY_FEE_UGX,
    };
  }
  try {
    const { data: membership, error: memErr } = await db
      .from("memberships")
      .select("tier, active, expires_at")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();
    if (!memErr && membership?.tier) {
      const expires = membership.expires_at ? new Date(membership.expires_at).getTime() : null;
      if (expires == null || expires > Date.now()) {
        const tier = String(membership.tier);
        return {
          tier,
          freeDeliveryThreshold: freeDeliveryThresholdForTier(tier),
          deliveryFee: DELIVERY_FEE_UGX,
        };
      }
    }
    if (memErr && !isMissing(memErr)) throw memErr;

    const { data: profile, error: profErr } = await db
      .from("profiles")
      .select("membership_tier, onesource_plus")
      .eq("id", userId)
      .maybeSingle();
    if (!profErr && profile) {
      if (profile.onesource_plus) {
        return {
          tier: "member",
          freeDeliveryThreshold: freeDeliveryThresholdForTier("member"),
          deliveryFee: DELIVERY_FEE_UGX,
        };
      }
      if (profile.membership_tier) {
        const tier = String(profile.membership_tier);
        return {
          tier,
          freeDeliveryThreshold: freeDeliveryThresholdForTier(tier),
          deliveryFee: DELIVERY_FEE_UGX,
        };
      }
    }
  } catch (e) {
    if (!isMissing(e)) {
      console.warn("[membership] lookup failed:", e.message || e);
    }
  }
  return {
    tier: "standard",
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD_UGX,
    deliveryFee: DELIVERY_FEE_UGX,
  };
}

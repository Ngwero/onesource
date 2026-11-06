import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";
import {
  FREE_DELIVERY_THRESHOLD_UGX,
  DELIVERY_FEE_UGX,
  MEMBER_FREE_DELIVERY_THRESHOLD_UGX,
} from "../lib/orderPricing.js";
import { getMembershipTier } from "../lib/membershipService.js";
import { tableExists } from "../lib/tableDetect.js";

const router = Router();

router.get("/benefits", (_req, res) => {
  res.json({
    name: "One Source Plus",
    freeDeliveryThresholdUgx: FREE_DELIVERY_THRESHOLD_UGX,
    memberFreeDeliveryThresholdUgx: MEMBER_FREE_DELIVERY_THRESHOLD_UGX,
    deliveryFeeUgx: DELIVERY_FEE_UGX,
    billing: "none",
    benefits: [
      `Members: free delivery from UGX ${MEMBER_FREE_DELIVERY_THRESHOLD_UGX.toLocaleString("en-UG")}`,
      `Everyone else: free delivery from UGX ${FREE_DELIVERY_THRESHOLD_UGX.toLocaleString("en-UG")}`,
      "Access to member-only timed deals when FEATURE_TIMED_DEALS is on",
      "Enrol for free — nothing is charged",
    ],
  });
});

router.get("/me", async (req, res) => {
  if (!isFeatureEnabled("membership")) {
    return res.json({
      enrolled: false,
      disabled: true,
      freeDeliveryThresholdUgx: FREE_DELIVERY_THRESHOLD_UGX,
      thresholds: {
        standard: FREE_DELIVERY_THRESHOLD_UGX,
        member: MEMBER_FREE_DELIVERY_THRESHOLD_UGX,
      },
    });
  }
  if (!req.auth?.id) {
    return res.json({
      enrolled: false,
      signedIn: false,
      freeDeliveryThresholdUgx: FREE_DELIVERY_THRESHOLD_UGX,
      thresholds: {
        standard: FREE_DELIVERY_THRESHOLD_UGX,
        member: MEMBER_FREE_DELIVERY_THRESHOLD_UGX,
      },
    });
  }
  try {
    const db = requireSupabase();
    if (!(await tableExists(db, "profiles"))) {
      return res.json({
        enrolled: false,
        missing: true,
        freeDeliveryThresholdUgx: FREE_DELIVERY_THRESHOLD_UGX,
      });
    }
    const membership = await getMembershipTier(db, req.auth.id);
    const { data } = await db
      .from("profiles")
      .select("onesource_plus, onesource_plus_enrolled_at")
      .eq("id", req.auth.id)
      .maybeSingle();
    res.json({
      enrolled: Boolean(data?.onesource_plus) || membership.tier !== "standard",
      enrolledAt: data?.onesource_plus_enrolled_at ?? null,
      signedIn: true,
      tier: membership.tier,
      freeDeliveryThresholdUgx: membership.freeDeliveryThreshold,
      thresholds: {
        standard: FREE_DELIVERY_THRESHOLD_UGX,
        member: MEMBER_FREE_DELIVERY_THRESHOLD_UGX,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/enroll", async (req, res) => {
  if (!isFeatureEnabled("membership")) {
    return res.status(404).json({ error: "Membership UI is not enabled", disabled: true });
  }
  if (!req.auth?.id) return res.status(401).json({ error: "Sign in required" });
  try {
    const db = requireSupabase();
    if (!(await tableExists(db, "profiles"))) {
      return res.status(503).json({
        error: "Run server/supabase/profiles-plus.sql",
        missing: true,
      });
    }
    const enrolledAt = new Date().toISOString();
    // Prefer memberships table when present; also set free Plus flag on profiles.
    const { error: memErr } = await db.from("memberships").upsert(
      {
        user_id: req.auth.id,
        tier: "member",
        active: true,
        starts_at: enrolledAt,
        expires_at: null,
      },
      { onConflict: "user_id" }
    );
    if (memErr && !/does not exist|schema cache|PGRST/i.test(memErr.message || "")) {
      // ignore missing table; try profiles-plus columns
    }

    const { data, error } = await db
      .from("profiles")
      .update({
        onesource_plus: true,
        onesource_plus_enrolled_at: enrolledAt,
        membership_tier: "member",
      })
      .eq("id", req.auth.id)
      .select("onesource_plus, onesource_plus_enrolled_at, membership_tier")
      .maybeSingle();
    if (error) {
      if (/onesource_plus|membership_tier/i.test(error.message || "")) {
        // Soft success if memberships upsert worked
        if (!memErr) {
          return res.json({
            enrolled: true,
            enrolledAt,
            note: "Free enrolment — no payment collected.",
          });
        }
        return res.status(503).json({
          error: "Run server/supabase/profiles-plus.sql and/or memberships.sql",
          missing: true,
        });
      }
      throw error;
    }
    res.json({
      enrolled: true,
      enrolledAt: data?.onesource_plus_enrolled_at || enrolledAt,
      note: "Free enrolment — no payment collected.",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

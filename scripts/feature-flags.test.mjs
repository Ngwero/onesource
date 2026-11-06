import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getFeatureFlagsSync,
  isFeatureEnabled,
  featuresPublicPayload,
  FEATURE_FLAG_KEYS,
} from "../server/lib/featureFlags.js";
import { isDealLive } from "../server/lib/dealsService.js";
import {
  calcDeliveryFee,
  FREE_DELIVERY_THRESHOLD_UGX,
  MEMBER_FREE_DELIVERY_THRESHOLD_UGX,
  DELIVERY_FEE_UGX,
} from "../server/lib/orderPricing.js";
import { calcDeliveryFeeForTier } from "../server/lib/membershipService.js";

test("feature flags default off in production", () => {
  const flags = getFeatureFlagsSync({ env: { NODE_ENV: "production" } });
  for (const key of FEATURE_FLAG_KEYS) {
    assert.equal(flags[key], false, key);
  }
});

test("FEATURE_* env enables canonical and alias keys", () => {
  const env = {
    NODE_ENV: "production",
    FEATURE_WISHLISTS: "1",
    FEATURE_TIMED_DEALS: "true",
    FEATURE_CHAT: "yes",
    FEATURE_PUSH: "1",
  };
  assert.equal(isFeatureEnabled("wishlists", { env }), true);
  assert.equal(isFeatureEnabled("timedDeals", { env }), true);
  assert.equal(isFeatureEnabled("deals", { env }), true);
  assert.equal(isFeatureEnabled("supportChat", { env }), true);
  assert.equal(isFeatureEnabled("chat", { env }), true);
  assert.equal(isFeatureEnabled("push", { env }), true);
  assert.equal(isFeatureEnabled("pushNotifications", { env }), true);
});

test("FEATURE_FLAGS_JSON and region overrides apply", () => {
  const env = {
    NODE_ENV: "production",
    FEATURE_FLAGS_JSON: JSON.stringify({ cartUpsell: true }),
    FEATURE_FLAGS_BY_REGION: JSON.stringify({ UG: { membership: true } }),
  };
  assert.equal(isFeatureEnabled("cartUpsell", { env }), true);
  assert.equal(isFeatureEnabled("membership", { env, region: "UG" }), true);
  assert.equal(isFeatureEnabled("membership", { env, region: "KE" }), false);
});

test("public features payload includes aliases and serverNow", () => {
  const payload = featuresPublicPayload({
    env: { NODE_ENV: "production", FEATURE_RETURNS: "1" },
  });
  assert.equal(payload.flags.returns, true);
  assert.ok(payload.serverNow);
  assert.equal(typeof payload.flags.deals, "boolean");
  assert.equal(typeof payload.flags.chat, "boolean");
});

test("deal expiry uses server clock only", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");
  const live = {
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-06-01T18:00:00.000Z",
    active: true,
  };
  const expired = {
    startsAt: "2026-05-01T00:00:00.000Z",
    endsAt: "2026-05-02T00:00:00.000Z",
    active: true,
  };
  assert.equal(isDealLive(live, now), true);
  assert.equal(isDealLive(expired, now), false);
  // Device clock ahead must not matter when caller passes server now
  assert.equal(isDealLive(expired, new Date("2099-01-01T00:00:00.000Z")), false);
});

test("membership lowers free delivery threshold", () => {
  assert.equal(calcDeliveryFee(MEMBER_FREE_DELIVERY_THRESHOLD_UGX - 1), DELIVERY_FEE_UGX);
  assert.equal(
    calcDeliveryFee(MEMBER_FREE_DELIVERY_THRESHOLD_UGX, { membershipTier: "member" }),
    0
  );
  assert.equal(
    calcDeliveryFee(MEMBER_FREE_DELIVERY_THRESHOLD_UGX, { membershipTier: "standard" }),
    DELIVERY_FEE_UGX
  );
  assert.equal(calcDeliveryFee(FREE_DELIVERY_THRESHOLD_UGX), 0);
  assert.equal(calcDeliveryFeeForTier(MEMBER_FREE_DELIVERY_THRESHOLD_UGX, "member"), 0);
  assert.equal(
    calcDeliveryFeeForTier(MEMBER_FREE_DELIVERY_THRESHOLD_UGX - 1, "member"),
    DELIVERY_FEE_UGX
  );
});

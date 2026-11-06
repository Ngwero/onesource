import { Router } from "express";
import { featuresPublicPayload, getFeatureFlags } from "../lib/featureFlags.js";
import { FREE_DELIVERY_THRESHOLD_UGX, DELIVERY_FEE_UGX } from "../lib/orderPricing.js";

const router = Router();

router.get("/", async (req, res) => {
  const region =
    String(req.query.region || req.get("x-feature-region") || "").trim() || undefined;
  await getFeatureFlags({ region });
  const payload = featuresPublicPayload({ region });
  res.set("Cache-Control", "no-store").json({
    ...payload,
    freeDeliveryThresholdUgx: FREE_DELIVERY_THRESHOLD_UGX,
    deliveryFeeUgx: DELIVERY_FEE_UGX,
  });
});

export default router;

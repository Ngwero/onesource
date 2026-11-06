/**
 * Process due subscription reorder reminders (queued inbox notifications).
 * Does NOT charge payment / retry charges.
 *
 * Usage: node server/scripts/run-subscription-orders.js
 * Or:    POST /api/internal/run-subscription-ticks with INTERNAL_CRON_SECRET
 */
import { requireSupabase, isSupabaseConfigured } from "../lib/supabase.js";
import { runSubscriptionTicks } from "../lib/subscriptionsService.js";
import { isFeatureEnabled } from "../lib/featureFlags.js";

async function main() {
  if (!isFeatureEnabled("subscriptions")) {
    console.log("[subscriptions] FEATURE_SUBSCRIPTIONS is off — exiting");
    process.exit(0);
  }
  if (!isSupabaseConfigured()) {
    console.error("[subscriptions] Supabase not configured");
    process.exit(1);
  }
  const result = await runSubscriptionTicks(requireSupabase());
  if (result.missing) {
    console.log("[subscriptions] tables missing — nothing to do");
    process.exit(0);
  }
  console.log(
    `[subscriptions] reminded ${result.reminded} subscriber(s) (no payment charge)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

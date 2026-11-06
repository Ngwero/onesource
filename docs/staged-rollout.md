# Staged rollout practice (flags + Sentry + App Store)

## Feature flags

Server reads `FEATURE_*` env vars (and optional `FEATURE_FLAGS_JSON` / `FEATURE_FLAGS_BY_REGION` / `FEATURE_FLAGS_URL`). Storefront and Flutter call `GET /api/features` (also `/api/flags`) and hide UI when a flag is off.

| Flag key | Env | Surface |
| --- | --- | --- |
| `wishlists` | `FEATURE_WISHLISTS` | Account lists + sync |
| `wishlistsShare` | `FEATURE_WISHLISTS_SHARE` | Public `/lists/shared/:token` |
| `timedDeals` (`deals`) | `FEATURE_TIMED_DEALS` / `FEATURE_DEALS` | Deal of the Day + checkout deal prices |
| `membership` | `FEATURE_MEMBERSHIP` | One Source Plus enrol + member free-delivery threshold |
| `cartUpsell` | `FEATURE_CART_UPSELL` | Cart suggestions |
| `returns` | `FEATURE_RETURNS` | Return request + photo (no payment refund) |
| `supportChat` (`chat`) | `FEATURE_SUPPORT_CHAT` / `FEATURE_CHAT` | Order-linked chat |
| `pushNotifications` (`push`) | `FEATURE_PUSH` | Device token + inbox hooks |
| `subscriptions` | `FEATURE_SUBSCRIPTIONS` | Reorder schedule (no charge retries) |
| `marketplace` | `FEATURE_MARKETPLACE` | Seller profiles |
| `sentry` | `FEATURE_SENTRY` | Client/server Sentry when DSN set |

**Region practice:** set `FEATURE_FLAGS_BY_REGION={"UG":{"timedDeals":true},"KE":{"timedDeals":false}}` and pass `?region=UG` from the client (or `FEATURE_REGION`).

**Vite mirrors (optional):** `VITE_FEATURE_*` for local UI without waiting on the API.

## Sentry

- Web: `VITE_SENTRY_DSN` — `src/lib/sentry.ts` no-ops without DSN; needs `@sentry/react` installed when enabling.
- Server: `SENTRY_DSN` reserved for future Node SDK (hooks should stay no-op without DSN).
- Flutter: add `sentry_flutter` later; gate with `SENTRY_DSN` dart-define. Do not ship a hard dependency until the flag is on.

## App Store phased release

1. Ship build with flags **off** in production (`NODE_ENV=production` defaults all false).
2. Paste matching `server/supabase/*.sql` for the feature you will enable.
3. Enable one flag per region (e.g. `FEATURE_WISHLISTS=1` for UG only via region JSON).
4. Use App Store Connect **Phased Release** (7-day ramp) for the binary that contains the new UI.
5. Watch Sentry + support chat volume; roll back by setting the env flag to `0` (no app update required for hide).
6. Admin surfaces (`/api/admin/returns`, `/api/admin/support`, `/api/admin/deals`, `/api/admin/sellers`) require a real admin session (`ADMIN_USER_IDS` / `app_metadata.role=admin`). Treat them as privileged even though the HTML admin shell is lightly gated.

## Cron

Subscription reminders (no payment):

```bash
node server/scripts/run-subscription-orders.js
# or POST /api/internal/run-subscription-ticks with INTERNAL_CRON_SECRET
```

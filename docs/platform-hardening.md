# Platform hardening — 26 October 2026

## Implemented

- Server-side session verification protects admin APIs, catalogue/content mutations, supplier/packaging data, uploads and order status changes. A query parameter cannot grant administration privileges.
- Customer order queries derive identity from the verified session and enforce ownership. Guest confirmations use an HMAC-signed token scoped to one guest order, valid for 30 days. Web stores it for the current browser session; mobile retains it for the current app session. Tokens are sent in a header, not a URL.
- The existing storefront login/OTP flow opens an admin session only after server-side role verification. The admin cookie is HttpOnly, SameSite=Strict and Secure under HTTPS. Cookie-based mutations require a matching Origin.
- Checkout uses catalogue prices. Fractional, unsafe and duplicate quantities are handled before reservation. Buyer IDs cannot be supplied by the client. Reservation rollback increments current stock with compare-and-swap rather than overwriting another order's stock changes.
- Basket hydration no longer overwrites concurrent additions/removals, clears saved items on temporary network errors, or redirects checkout while restoration is pending.
- Saved-list updates synchronize through the provider; product image/navigation state and effect dependencies were corrected. The stale Fresh-category test was updated. React Refresh is configured for the intentional provider/hook exports in context modules; other lint rules remain enabled.
- Existing 404 handling and smaller product-image URLs from commit 55f1a9f are retained.

## Admin configuration required before deployment

Approve the existing administrator account first. Grant `app_metadata.role = "admin"` using the Supabase admin API/dashboard, or set `ADMIN_USER_IDS` on the API to a comma-separated list of approved Supabase user UUIDs. Do not use editable profile fields or `user_metadata` for privileges. No user has been granted a role by this change.

Open `/admin` and sign in through the existing storefront flow. Non-admin accounts see an access-denied message. The panel includes a separate admin sign-out button. The Vite development server proxies `/admin` and preserves the forwarded host for Origin checks.

Optionally configure a high-entropy `ORDER_ACCESS_SECRET`. Otherwise the existing server-only Supabase service key is used for signing guest order access. Rotating the signing key invalidates existing guest confirmation tokens. Guest order tokens are credentials: do not put them in URLs or logs.

## Rollout and remaining limits

Deploy the updated web/API and distribute the updated mobile client together: older mobile clients do not send the new order Authorization/confirmation headers. Do not deploy the API alone and expect older clients' order history/guest confirmation to remain compatible.

The updated `server/supabase/reserve-stock.sql` is available for database-side reservations. It was not applied during this task. The API still supports the existing optimistic reservation fallback. Reservation and order creation are separate operations; recovery from a process crash or database outage between them is not a complete transactional checkout implementation. Cancellation/restocking policy also needs a durable reservation ledger before safely restoring legacy orders automatically.

Cold search latency depends on catalogue/index loading and remains a performance limitation. No production search indexes were changed in this task. All search regression checks should be rerun after a database indexing change.

No orders were placed, no catalogue/customer data was changed, and no deployment was performed during this work. The existing in-progress card/layout edits were preserved. Browser automation was unavailable, so real-device scrolling and signed-in visual admin flows still need a smoke test before release.

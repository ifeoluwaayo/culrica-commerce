# Phase 2: Chord commerce teammate

We already have a Next.js 16 storefront, persistent products, admin inventory controls and read-only `/api/products`.

Recommended Phase 2, within the TSG Labs exercise:

1. Add a `quotes` and `orders` PostgreSQL table to the same Supabase project. Each quote contains SKU, quantity, exact server-computed NGN price, shipping charge, expiry and status. Preserve the price at creation time.
2. Expose four tools using a remote MCP server: `search_products`, `quote_order`, `place_order`, `verify_order_payment`. The tool server should read inventory from the existing Culrica API or query Supabase server-to-server using its own credentials.
3. Add server-to-server authorization for any new internal routes (e.g. `Authorization: Bearer CHORD_TOOL_SECRET`). Never reuse the admin browser cookie for machine-to-machine calls. Use a separate secret and rate limits.
4. Paystack test mode only: initialize trusted order amount in **kobo**, return checkout URL, verify status+amount+reference+currency via Paystack's backend API. Handle failed/pending/duplicate verifications.
5. Inventory rule: reserve stock transactionally for a short TTL or recheck available stock in a DB transaction before final fulfilment. If a payment succeeds without stock, flag manual resolution and do not fabricate a shipment.
6. Show admin product quantity before and after a verified purchase. Orders dashboard is intentionally deferred to Phase 2.
7. Record exact real deployment failures and Chord platform feedback while integrating. Do not manufacture incidents.

## Success criterion

A simulated WhatsApp customer asks for 10kg of HIB-STD, receives an accurate quote, approves it, gets a genuine Paystack test link, pays in the test environment, and receives confirmation **only after** verified backend payment state and a persisted order change.

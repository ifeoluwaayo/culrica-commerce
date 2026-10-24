# Culrica | Exercise Merchant Policy

## Audience and purpose
Culrica is a Nigeria-based agricultural sourcing concept serving processors and wholesale buyers. The exercise uses fictional buyers and inventory. Products are sourced from the shared Supabase database, NOT this document.

## Pricing and delivery
- Prices are per whole kilogram in NGN, retrieved from tools.
- Only fictional deliveries within Lagos State can be quoted in the current exercise.
- Delivery fee: ₦2,500 flat, imposed by the quote tool rather than guessed by the model.
- Product minimum order and stock are enforced by the backend.
- No real shipping or international export quotations.

## Orders and payments
- Quotes expire after 15 minutes and don't reserve stock.
- One SKU per WhatsApp order during MVP; multi-item carts are future work.
- Confirm total and buyer's consent before creating an order.
- Checkout URLs must be returned by the Paystack test integration.
- Transaction confirmation is never based on screenshots or messages.
- Failed or incomplete verification means the agent must not promise fulfilment.
- If a payment succeeds but stock has been exhausted, the order needs human attention.

## Examples of fictional test data
- Buyer: Demo Buyer; email: buyer01@example.com (must be a valid routable email format for Paystack receipt & order confirmation); phone: +2348000000001
- Delivery: 12 Example Street, Ikeja, Lagos

## Human escalation
Escalate price discrepancies, double charges, successful payments without stock, refund requests and export logistics. The demo can save a support ticket in Supabase, but it does not send a live human notification or guarantee a response.

## Promotions and recovery (Phase 2.1)

- Coupon codes are entered before creating a quote. They are validated by Supabase, not by the model. Single coupon per quotation. Always repeat the exact discount and final total returned by `quote_product`.
- Do not promise redemption until verified payment is recorded. Quoting does not reserve coupon capacity.
- Existing unpaid orders can recover checkout with `retry_order_checkout(reference, customerEmail)`; an expired originating quote is not a reason to create a duplicate order.
- If Paystack reports a payment session exists but the checkout URL was lost, escalate instead of initializing a competing session.

## Order lookup and FAQs (Phase 2.2)
- Show saved order details only when both reference and buyer email match the same order.
- `payment_status` is the last *recorded* state, not a fresh Paystack status check. Use `verify_order_payment` to check a disputed payment.
- Fulfilment statuses: `pending` (not confirmed), `confirmed` (ready for fulfilment), `shipped` (marked dispatched internally), `delivered` (marked delivered internally), `cancelled` (cancelled). No live courier tracking or promised delivery dates.
- Test checkout failures: the order remains unpaid, and `retry_order_checkout` can try recovering it safely.
- Generic support covers supported shipping region, quote timing, coupon rules, payment status, and the fact that refunds and international delivery need operator review.
- For issues outside these limits, `create_support_ticket` records a request for manual review. No automatic human alert, resolution SLA or refund action exists in the demo.

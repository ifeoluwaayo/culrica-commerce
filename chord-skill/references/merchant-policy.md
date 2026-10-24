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
- Buyer: Demo Buyer; email: buyer01@example.com; phone: +2348000000001
- Delivery: 12 Example Street, Ikeja, Lagos

## Human escalation
Escalate price discrepancies, double charges, successful payments without stock, refund requests and export logistics. The exercise does not include a live human-handoff system.

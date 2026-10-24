# Three-minute recording guide

**0:00–0:25: Business context**
"Culrica helps buyers source Nigerian produce. WhatsApp enquiries often stop before an order and payment. I built Ada on Chord to convert a product enquiry into a Paystack-verified wholesale test order."

**0:25–1:45: Show complete conversation**
- Buyer requests 10kg hibiscus.
- Show `search_products` accessing updated inventory and `quote_product` calculating ₦87,500 with Lagos test delivery.
- Buyer explicitly confirms, then gives fictional buyer details.
- Show `place_order` returning reference and a real Paystack test checkout link.
- Complete test checkout or show proof of a previously completed test payment.
- Ask agent to verify; show `verify_order_payment` result and order in admin.

**1:45–2:20: Evidence of state change**
- Show `orders.payment_status = paid`, `orders.status = confirmed`, order item stored.
- Show updated product stock and inventory movement.
- Repeat verification and confirm stock is not deducted again.

**2:20–2:45: Boundary / failure**
- Request a quantity greater than stock; demonstrate a clear refusal and no inserted order.

**2:45–3:00: Field notes**
- Show one genuine deployment incident and explain diagnosis and Chord feedback.

**Before recording:** Reset test inventory as appropriate, pre-create fictional orders or use fresh quote to avoid expired quote, avoid accidentally exposing API keys or customer information, keep test environment visible.

from pathlib import Path
root=Path(__file__).resolve().parents[1]
mcp=(root/'src/app/api/mcp/route.ts').read_text()
code=(root/'src/lib/chord-commerce.ts').read_text()
sql=(root/'supabase/chord-coupons-and-recovery.sql').read_text()
skill=(root/'chord-skill/SKILL.md').read_text()
assert "server.registerTool('retry_order_checkout'" in mcp
assert "couponCode: z.string()" in mcp
assert 'retryOrderCheckout' in code
assert 'PAYSTACK_INITIALIZATION_FAILED' in code
assert "inspectPaymentReference" in code
assert "order.chord_checkout_url" in code
assert "v_quote.discount_ngn" in sql
assert "v_quote.coupon_code" in sql
assert 'max_redemptions' in sql
assert 'coupon_code, status' in sql
assert 'retry_order_checkout' in skill
print('PASS: all patch components are present')

import { timingSafeEqual } from 'node:crypto';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import {
  searchProducts, quoteProduct, placeOrder, verifyOrderPayment, retryOrderCheckout,
  getOrderDetails, createSupportTicket
} from '@/lib/chord-commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function toolResponse(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}
function toolFailure(error: unknown) {
  // Database errors are returned without secrets. This is a test-only endpoint.
  const message = error instanceof Error ? error.message : 'Unknown error';
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

const handler = createMcpHandler((server) => {
  server.registerTool('get_order_details', {
    title: 'Look up an existing Culrica order',
    description: 'Read saved order items, totals, coupon, payment and fulfilment states after matching the order reference AND fictional buyer email. Does not update order state or provide live courier tracking.',
    inputSchema: z.object({
      reference: z.string().min(5).max(80),
      customerEmail: z.string().email().max(200)
    })
  }, async ({ reference, customerEmail }) => {
    try { return toolResponse(await getOrderDetails(reference, customerEmail)); }
    catch (error) { return toolFailure(error); }
  });

  server.registerTool('create_support_ticket', {
    title: 'Create a human-support request',
    description: 'Save a simple fictional-customer support issue in Supabase, optionally attached to an owned order. Never claims to notify an agent, issue a refund or fix a problem.',
    inputSchema: z.object({
      customerEmail: z.string().email().max(200),
      orderReference: z.string().min(5).max(80).optional(),
      category: z.enum(['order_issue', 'payment_issue', 'delivery_question', 'product_question', 'coupon_issue', 'other']),
      message: z.string().min(10).max(500)
    })
  }, async (args) => {
    try { return toolResponse(await createSupportTicket(args)); }
    catch (error) { return toolFailure(error); }
  });

  server.registerTool('search_products', {
    title: 'Search Culrica products',
    description: 'Search the actual Culrica demo catalogue. Prices and available stock are returned by the database.',
    inputSchema: z.object({ query: z.string().max(100).default('') })
  }, async ({ query }) => {
    try { return toolResponse(await searchProducts(query)); }
    catch (error) { return toolFailure(error); }
  });

  server.registerTool('quote_product', {
    title: 'Create a real price quotation',
    description: 'Calculate a live Lagos quote and optional coupon discount from Supabase. The database validates coupon eligibility and returns the authoritative total. Does not create an order.',
    inputSchema: z.object({
      sku: z.string().min(2).max(50),
      quantityKg: z.number().int().min(1).max(1000),
      couponCode: z.string().max(40).optional()
    })
  }, async ({ sku, quantityKg, couponCode }) => {
    try { return toolResponse(await quoteProduct(sku, quantityKg, couponCode)); }
    catch (error) { return toolFailure(error); }
  });

  server.registerTool('place_order', {
    title: 'Place a Culrica demo order and generate checkout',
    description: 'ONLY after explicit buyer approval of the quote total. Persists an order and initializes Paystack test checkout.',
    inputSchema: z.object({
      quoteId: z.string().uuid(),
      customerName: z.string().min(2).max(120),
      customerEmail: z.string().email().max(200),
      customerPhone: z.string().min(6).max(24),
      shippingAddress: z.string().min(4).max(200),
      shippingCity: z.string().min(2).max(80),
      shippingState: z.string().min(2).max(80)
    })
  }, async (args) => {
    try { return toolResponse(await placeOrder(args)); }
    catch (error) { return toolFailure(error); }
  });

  server.registerTool('retry_order_checkout', {
    title: 'Recover an existing unpaid order checkout',
    description: 'Use order reference and demo buyer email to recover an existing checkout safely. NEVER creates a new order. If Paystack already initialized the reference but the URL is lost, stops for manual review.',
    inputSchema: z.object({
      reference: z.string().min(5).max(80),
      customerEmail: z.string().email().max(200)
    })
  }, async ({ reference, customerEmail }) => {
    try { return toolResponse(await retryOrderCheckout(reference, customerEmail)); }
    catch (error) { return toolFailure(error); }
  });

  server.registerTool('verify_order_payment', {
    title: 'Verify Paystack transaction and confirm order',
    description: 'Check Paystack directly, compare transaction reference, buyer email, currency and amount. Record payment and adjust stock only if verified.',
    inputSchema: z.object({
      reference: z.string().min(5).max(80),
      customerEmail: z.string().email().max(200)
    })
  }, async ({ reference, customerEmail }) => {
    try { return toolResponse(await verifyOrderPayment(reference, customerEmail)); }
    catch (error) { return toolFailure(error); }
  });
});

function authorized(request: Request): boolean {
  const token = process.env.CHORD_MCP_TOKEN;
  if (!token || token.length < 32) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const got = Buffer.from(request.headers.get('authorization') ?? '');
  return expected.length === got.length && timingSafeEqual(expected, got);
}

async function secureMcp(request: Request) {
  if (!process.env.CHORD_MCP_TOKEN) {
    return Response.json({ error: 'MCP endpoint is not configured' }, { status: 503 });
  }
  if (!authorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401,
      headers: { 'Cache-Control': 'no-store' } });
  }
  return handler(request);
}

export { secureMcp as GET, secureMcp as POST };

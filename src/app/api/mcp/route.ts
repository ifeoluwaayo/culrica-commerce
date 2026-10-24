import { timingSafeEqual } from 'node:crypto';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import {
  searchProducts, quoteProduct, placeOrder, verifyOrderPayment
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
    description: 'Validate stock, calculate a Lagos delivery quote and save an expiring quote. Does not create an order.',
    inputSchema: z.object({
      sku: z.string().min(2).max(50),
      quantityKg: z.number().int().min(1).max(1000)
    })
  }, async ({ sku, quantityKg }) => {
    try { return toolResponse(await quoteProduct(sku, quantityKg)); }
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

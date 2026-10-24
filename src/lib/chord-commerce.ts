import 'server-only';
import { createClient } from '@supabase/supabase-js';

// The service-role key is server-side only and never returned to Chord or users.
function db() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('DATABASE_NOT_CONFIGURED');
  return createClient(url, key, { auth: { persistSession: false } });
}

function testPaystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key?.startsWith('sk_test_')) throw new Error('PAYSTACK_TEST_KEY_REQUIRED');
  return key;
}

function safeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@(?:example\.(?:com|org|net)|[a-z0-9-]+\.test)$/.test(normalized)) {
    throw new Error('Use a fictional email ending in @example.com or .test for the exercise');
  }
  return normalized;
}

function dataOrError<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No result was returned');
  return data;
}

type Product = {
  sku: string; name: string; tagline: string; description: string;
  category: string; origin: string; price_ngn: number;
  stock_kg: number; min_order_kg: number;
};

type OrderResult = {
  orderId: string; reference: string; paymentReference: string;
  totalNgn: number; paymentStatus: string; checkoutUrl: string | null;
  existing: boolean;
};

type OrderRecord = {
  id: string; reference: string; customer_email: string;
  payment_reference: string; total_ngn: number;
  payment_status: string; status: string; stock_deducted: boolean;
};

export async function searchProducts(query: string) {
  const { data, error } = await db().from('products')
    .select('sku,name,tagline,description,category,origin,price_ngn,stock_kg,min_order_kg')
    .eq('is_active', true).order('name').limit(100);
  const products = dataOrError(data, error) as Product[];
  const term = query.toLowerCase().trim();
  const matches = products.filter(p => !term ||
    [p.sku,p.name,p.tagline,p.description,p.category,p.origin]
      .some(value => value.toLowerCase().includes(term)));
  return { products: matches.map(p => ({
    sku: p.sku, name: p.name, description: p.description,
    category: p.category, origin: p.origin,
    priceNgnPerKg: p.price_ngn, availableKg: p.stock_kg,
    minimumKg: p.min_order_kg
  })), currency: 'NGN', source: 'live Supabase inventory' };
}

export async function quoteProduct(sku: string, quantityKg: number) {
  const { data, error } = await db().rpc('chord_make_quote', {
    p_sku: sku, p_quantity_kg: quantityKg
  });
  return dataOrError(data, error);
}

async function initializeCheckout(reference: string, email: string, totalNgn: number, orderId: string) {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${testPaystackKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email, amount: totalNgn * 100, currency: 'NGN', reference,
      metadata: { order_id: orderId, channel: 'chord_exercise' }
    }),
    cache: 'no-store', signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json();
  if (!response.ok || payload.status !== true || !payload.data?.authorization_url) {
    throw new Error('PAYSTACK_CHECKOUT_UNAVAILABLE');
  }
  return payload.data.authorization_url as string;
}

export async function placeOrder(args: {
  quoteId: string; customerName: string; customerEmail: string;
  customerPhone: string; shippingAddress: string; shippingCity: string;
  shippingState: string;
}) {
  const email = safeEmail(args.customerEmail);
  const { data, error } = await db().rpc('chord_place_order', {
    p_quote_id: args.quoteId,
    p_customer_name: args.customerName,
    p_customer_email: email,
    p_customer_phone: args.customerPhone,
    p_shipping_address: args.shippingAddress,
    p_shipping_city: args.shippingCity,
    p_shipping_state: args.shippingState
  });
  const order = dataOrError(data, error) as OrderResult;

  if (order.paymentStatus === 'paid') {
    return { reference: order.reference, status: 'already_paid', totalNgn: order.totalNgn };
  }
  if (order.checkoutUrl) {
    return { reference: order.reference, checkoutUrl: order.checkoutUrl,
      totalNgn: order.totalNgn, status: 'awaiting_payment', reused: true };
  }

  // An order is saved even if Paystack is temporarily unreachable.
  // Retrying the same quote does not create another order.
  let url: string;
  try {
    url = await initializeCheckout(order.paymentReference, email, order.totalNgn, order.orderId);
  } catch {
    return { reference: order.reference, status: 'checkout_unavailable',
      message: 'Order saved, but Paystack checkout could not be initialized. Do not claim payment succeeded.' };
  }
  const update = await db().from('orders')
    .update({ chord_checkout_url: url })
    .eq('id', order.orderId).is('chord_checkout_url', null);
  if (update.error) throw new Error('CHECKOUT_LINK_STORAGE_FAILED');

  return { reference: order.reference, checkoutUrl: url,
    totalNgn: order.totalNgn, status: 'awaiting_payment', reused: order.existing };
}

export async function verifyOrderPayment(reference: string, customerEmail: string) {
  const email = safeEmail(customerEmail);
  const { data, error } = await db().from('orders')
    .select('id,reference,customer_email,payment_reference,total_ngn,payment_status,status,stock_deducted')
    .eq('reference', reference.trim()).eq('customer_email', email).maybeSingle();
  if (error) throw new Error('ORDER_LOOKUP_FAILED');
  const order = data as OrderRecord | null;
  if (!order) return { status: 'not_found', message: 'Order not found for this demo buyer email.' };
  if (!order.payment_reference) return { status: 'unavailable', message: 'No payment reference exists.' };

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(order.payment_reference)}`,
    { headers: { Authorization: `Bearer ${testPaystackKey()}` },
      cache: 'no-store', signal: AbortSignal.timeout(15000) }
  );
  if (!response.ok) return { status: 'verification_unavailable',
    message: 'Could not verify with Paystack; order is not confirmed.' };
  const payload = await response.json();
  const txn = payload?.data;
  if (payload?.status !== true || !txn) return { status: 'verification_unavailable' };
  if (txn.status !== 'success') {
    return { status: 'unpaid', paystackStatus: txn.status,
      message: 'Paystack has not confirmed a successful payment.' };
  }
  if (txn.reference !== order.payment_reference || txn.currency !== 'NGN' ||
      txn.amount !== order.total_ngn * 100 ||
      String(txn.customer?.email ?? '').toLowerCase() !== order.customer_email) {
    return { status: 'manual_review',
      message: 'Payment details do not match the order. Do not fulfil.' };
  }

  // Existing SQL functions are authoritative for idempotent payment state and
  // one-time stock decrement. Mark paid first; if stock disappeared during
  // checkout, leave the order paid but pending human fulfilment review.
  const paymentResult = await db().rpc('mark_order_paid', {
    p_order_id: order.id, p_reference: order.payment_reference,
    p_amount_ngn: order.total_ngn
  });
  if (paymentResult.error) throw new Error('PAYMENT_STATE_UPDATE_FAILED');
  const fulfilmentResult = await db().rpc('set_order_status', {
    p_order_id: order.id, p_status: 'confirmed'
  });
  if (fulfilmentResult.error) {
    return { reference: order.reference, status: 'paid_awaiting_manual_fulfilment',
      message: 'Payment is verified and recorded, but inventory could not be committed automatically. A human must review the order.' };
  }
  return { reference: order.reference, status: 'paid_confirmed',
    totalNgn: order.total_ngn,
    message: 'Verified through Paystack test mode; inventory was deducted at most once.' };
}

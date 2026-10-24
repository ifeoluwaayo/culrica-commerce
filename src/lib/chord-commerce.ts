import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Private server-only service-role client. Never expose this key to Chord or a browser.
function db() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('DATABASE_NOT_CONFIGURED');
  return createClient(url, key, { auth: { persistSession: false } });
}

function testPaystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
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
  chord_checkout_url?: string | null;
};

export async function searchProducts(query: string) {
  const { data, error } = await db().from('products')
    .select('sku,name,tagline,description,category,origin,price_ngn,stock_kg,min_order_kg')
    .eq('is_active', true).order('name').limit(100);
  const products = dataOrError(data, error) as Product[];
  const term = query.toLowerCase().trim();
  const matches = products.filter(p => !term ||
    [p.sku, p.name, p.tagline, p.description, p.category, p.origin]
      .some(value => value.toLowerCase().includes(term)));
  return { products: matches.map(p => ({
    sku: p.sku, name: p.name, description: p.description,
    category: p.category, origin: p.origin,
    priceNgnPerKg: p.price_ngn, availableKg: p.stock_kg,
    minimumKg: p.min_order_kg
  })), currency: 'NGN', source: 'live Supabase inventory' };
}

// Optional coupon. The database, not the language model, decides eligibility and amount.
export async function quoteProduct(sku: string, quantityKg: number, couponCode?: string) {
  const code = couponCode?.trim().toUpperCase() || null;
  const { data, error } = await db().rpc('chord_make_quote', {
    p_sku: sku, p_quantity_kg: quantityKg, p_coupon_code: code
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
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== true || !payload?.data?.authorization_url) {
    // Never log access credentials, request Authorization header or buyer email.
    console.error('PAYSTACK_INITIALIZATION_FAILED', {
      reference, httpStatus: response.status,
      message: typeof payload?.message === 'string' ? payload.message.slice(0, 300) : 'Unexpected Paystack response'
    });
    throw new Error(`PAYSTACK_INITIALIZATION_HTTP_${response.status}`);
  }
  return payload.data.authorization_url as string;
}

function logCheckoutFailure(orderReference: string, err: unknown) {
  const errorCode = err instanceof Error ? err.message : 'UNKNOWN_CHECKOUT_ERROR';
  console.error('CHORD_CHECKOUT_ERROR', { orderReference, errorCode });
  return { reference: orderReference, status: 'checkout_unavailable' as const,
    message: 'Order remains unpaid. Checkout could not be initialized; operator should check Vercel logs and Paystack Test Mode.' };
}

async function persistCheckoutLink(orderId: string, reference: string, url: string) {
  const { data, error } = await db().from('orders')
    .update({ chord_checkout_url: url })
    .eq('id', orderId).is('chord_checkout_url', null)
    .select('chord_checkout_url').maybeSingle();
  if (error) throw new Error('CHECKOUT_LINK_STORAGE_FAILED');
  if (data?.chord_checkout_url) return data.chord_checkout_url as string;
  // Concurrent tool call may already have saved the link; return that exact link.
  const latest = await db().from('orders').select('chord_checkout_url').eq('id', orderId).single();
  if (latest.error || !latest.data?.chord_checkout_url) {
    console.error('CHECKOUT_LINK_STORAGE_FAILED', { reference });
    throw new Error('CHECKOUT_LINK_STORAGE_FAILED');
  }
  return latest.data.chord_checkout_url as string;
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

  // The saved order survives failed checkout. For ambiguous failures, recover
  // via retryOrderCheckout rather than creating a fresh order.
  let url: string;
  try {
    url = await initializeCheckout(order.paymentReference, email, order.totalNgn, order.orderId);
  } catch (err) {
    return logCheckoutFailure(order.reference, err);
  }
  try {
    url = await persistCheckoutLink(order.orderId, order.reference, url);
  } catch (err) {
    return logCheckoutFailure(order.reference, err);
  }
  return { reference: order.reference, checkoutUrl: url,
    totalNgn: order.totalNgn, status: 'awaiting_payment', reused: order.existing };
}

// If Paystack created a session but the app lost the response, the old checkout
// URL cannot reliably be reconstructed from /transaction/verify. We deliberately
// refuse to initialize a second charge attempt in that ambiguous state.
async function inspectPaymentReference(reference: string): Promise<'missing' | 'existing' | 'paid' | 'unavailable'> {
  let response: Response;
  try {
    response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${testPaystackKey()}` },
        cache: 'no-store', signal: AbortSignal.timeout(15000) }
    );
  } catch (err) {
    console.error('PAYSTACK_REFERENCE_LOOKUP_FAILED', { reference,
      errorCode: err instanceof Error ? err.message : 'UNKNOWN_ERROR' });
    return 'unavailable';
  }
  const payload = await response.json().catch(() => null);
  if (response.ok && payload?.status === true && payload?.data) {
    return payload.data.status === 'success' ? 'paid' : 'existing';
  }
  const msg = String(payload?.message ?? '').toLowerCase();
  // Only retry initialization when Paystack explicitly says no transaction exists.
  if (response.status === 404 ||
      ((response.status === 400 || response.status === 422) &&
       /reference not found|transaction not found|transaction does not exist|no transaction found/.test(msg))) {
    return 'missing';
  }
  console.error('PAYSTACK_REFERENCE_LOOKUP_INCONCLUSIVE', {
    reference, httpStatus: response.status, message: msg.slice(0, 200)
  });
  return 'unavailable';
}

export async function retryOrderCheckout(reference: string, customerEmail: string) {
  const email = safeEmail(customerEmail);
  const { data, error } = await db().from('orders')
    .select('id,reference,customer_email,payment_reference,total_ngn,payment_status,status,stock_deducted,chord_checkout_url')
    .eq('reference', reference.trim()).eq('customer_email', email).maybeSingle();
  if (error) throw new Error('ORDER_LOOKUP_FAILED');
  const order = data as OrderRecord | null;
  if (!order) return { status: 'not_found', message: 'No matching order for that fictional buyer email.' };
  if (order.status === 'cancelled') return { status: 'cancelled', reference: order.reference };
  if (order.payment_status === 'paid') return { status: 'already_paid', reference: order.reference };
  if (order.chord_checkout_url) return {
    status: 'awaiting_payment', reference: order.reference,
    checkoutUrl: order.chord_checkout_url, totalNgn: order.total_ngn, reused: true
  };
  if (!order.payment_reference) return { status: 'manual_review', reference: order.reference,
    message: 'Order has no payment reference. Human intervention required.' };

  const state = await inspectPaymentReference(order.payment_reference);
  if (state === 'paid') return verifyOrderPayment(order.reference, email);
  if (state === 'existing') return {
    status: 'manual_review', reference: order.reference,
    message: 'Paystack already has this transaction, but its checkout URL was not saved. Do not create a duplicate payment session. Operator must recover the session or reconcile it.'
  };
  if (state === 'unavailable') return { status: 'verification_unavailable', reference: order.reference,
    message: 'Cannot safely determine whether Paystack already created this payment. Try later or ask the operator.' };

  try {
    const url = await initializeCheckout(order.payment_reference, email, order.total_ngn, order.id);
    const storedUrl = await persistCheckoutLink(order.id, order.reference, url);
    return { reference: order.reference, checkoutUrl: storedUrl,
      totalNgn: order.total_ngn, status: 'awaiting_payment', reused: true };
  } catch (err) {
    return logCheckoutFailure(order.reference, err);
  }
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

  // Existing SQL procedures are authoritative for idempotent payment state and
  // one-time stock decrement. If stock disappears during checkout, preserve the
  // paid status and request manual fulfilment rather than pretending to ship.
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


// Phase 2.2: read-only order lookup. The order reference and fictional buyer
// email must BOTH match. This is demo authentication, not production identity.
export async function getOrderDetails(reference: string, customerEmail: string) {
  const email = safeEmail(customerEmail);
  const orderRef = reference.trim().toUpperCase();
  const { data, error } = await db().from('orders')
    .select('id,reference,status,payment_status,subtotal_ngn,discount_ngn,delivery_ngn,total_ngn,coupon_code,paid_at,created_at,updated_at,shipping_city,shipping_state')
    .eq('reference', orderRef).eq('customer_email', email).maybeSingle();
  if (error) throw new Error('ORDER_LOOKUP_FAILED');
  if (!data) {
    return { status: 'not_found', message: 'No matching order for that reference and demo buyer email.' };
  }
  const { data: items, error: itemsError } = await db().from('order_items')
    .select('sku,name,price_ngn,quantity_kg,line_total_ngn')
    .eq('order_id', data.id).order('name');
  if (itemsError) throw new Error('ORDER_ITEMS_LOOKUP_FAILED');

  const paymentStatus = data.payment_status as string;
  const fulfilmentStatus = data.status as string;
  let nextStep = 'Order details available; no action required right now.';
  if (fulfilmentStatus === 'cancelled') {
    nextStep = 'Order is cancelled. For payment or refund questions, request human support.';
  } else if (paymentStatus !== 'paid') {
    nextStep = 'Payment is not recorded as successful. Offer checkout recovery or payment verification if appropriate.';
  } else if (fulfilmentStatus === 'pending') {
    nextStep = 'Payment is recorded, but fulfilment is not confirmed. Offer human follow-up if needed.';
  } else if (fulfilmentStatus === 'confirmed') {
    nextStep = 'Order is confirmed; do not invent a dispatch date.';
  } else if (fulfilmentStatus === 'shipped') {
    nextStep = 'Order is marked shipped; no carrier tracking data is available in this tool.';
  } else if (fulfilmentStatus === 'delivered') {
    nextStep = 'Order is marked delivered in the merchant system.';
  }

  return {
    status: 'found',
    reference: data.reference,
    createdAt: data.created_at,
    lastUpdatedAt: data.updated_at,
    paymentStatus,
    paidAt: data.paid_at,
    fulfilmentStatus,
    items: (items ?? []).map(i => ({
      sku: i.sku, name: i.name, quantityKg: i.quantity_kg,
      unitPriceNgn: i.price_ngn, lineTotalNgn: i.line_total_ngn
    })),
    subtotalNgn: data.subtotal_ngn,
    discountNgn: data.discount_ngn,
    couponCode: data.coupon_code,
    deliveryNgn: data.delivery_ngn,
    totalNgn: data.total_ngn,
    deliveryArea: `${data.shipping_city}, ${data.shipping_state}`,
    nextStep,
    source: 'Saved Culrica order record. No live courier tracking or delivery ETA.'
  };
}

// Phase 2.2: small, durable escalation mechanism. A ticket is a recorded
// request only; this tool does NOT notify a support person or resolve it.
export async function createSupportTicket(args: {
  customerEmail: string;
  orderReference?: string;
  category: 'order_issue' | 'payment_issue' | 'delivery_question' | 'product_question' | 'coupon_issue' | 'other';
  message: string;
}) {
  const email = safeEmail(args.customerEmail);
  const message = args.message.trim();
  if (message.length < 10 || message.length > 500) {
    throw new Error('SUPPORT_MESSAGE_LENGTH_INVALID');
  }
  let orderId: string | null = null;
  if (args.orderReference?.trim()) {
    const { data, error } = await db().from('orders')
      .select('id').eq('reference', args.orderReference.trim().toUpperCase())
      .eq('customer_email', email).maybeSingle();
    if (error) throw new Error('SUPPORT_ORDER_LOOKUP_FAILED');
    if (!data) return {
      status: 'order_not_found',
      message: 'Cannot attach this order: reference and fictional buyer email did not match.'
    };
    orderId = data.id;
  }
  const { data: ticket, error } = await db().from('chord_support_tickets')
    .insert({ customer_email: email, order_id: orderId,
      category: args.category, issue_text: message })
    .select('ticket_reference,status,category,created_at').single();
  if (error || !ticket) {
    console.error('CHORD_SUPPORT_TICKET_CREATE_FAILED', { code: error?.code ?? 'NO_RESULT' });
    throw new Error('SUPPORT_TICKET_CREATE_FAILED');
  }
  return {
    status: 'created', ticketReference: ticket.ticket_reference,
    ticketStatus: ticket.status, category: ticket.category,
    createdAt: ticket.created_at,
    message: 'Support request recorded. No staff notification or resolution time is guaranteed in this demo.'
  };
}

import "server-only";
import { randomBytes } from "node:crypto";
import {
  evaluateCoupon, type CheckoutInput, type Coupon, type CouponInput, type Order, type OrderItem, type OrderStatus
} from "./commerce";
import { allProducts, applyLocalStock } from "./store";
import { assertStorageConfigured, db, dbError, localMutation, readCommerce, readLocal, useSupabase, writeCommerce, writeLocal } from "./db";

/* ------------------------------- Coupons ------------------------------- */

type CouponRow = {
  id: string; code: string; description: string; discount_type: Coupon["discountType"]; discount_value: number;
  min_subtotal_ngn: number; max_redemptions: number | null; redemptions: number; starts_at: string | null;
  ends_at: string | null; is_active: boolean; created_at: string; updated_at: string;
};
const couponFromRow = (r: CouponRow): Coupon => ({
  id: r.id, code: r.code, description: r.description, discountType: r.discount_type, discountValue: r.discount_value,
  minSubtotalNgn: r.min_subtotal_ngn, maxRedemptions: r.max_redemptions, redemptions: r.redemptions,
  startsAt: r.starts_at, endsAt: r.ends_at, isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at
});
const couponToRow = (c: CouponInput) => ({
  code: c.code, description: c.description, discount_type: c.discountType, discount_value: c.discountValue,
  min_subtotal_ngn: c.minSubtotalNgn, max_redemptions: c.maxRedemptions, starts_at: c.startsAt, ends_at: c.endsAt,
  is_active: c.isActive
});
const DUP_COUPON = "A coupon with that code already exists.";

export async function allCoupons(): Promise<Coupon[]> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db().from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to fetch coupons: ${error.message}`);
    return ((data ?? []) as CouponRow[]).map(couponFromRow);
  }
  return (await readCommerce()).coupons;
}

export async function couponByCode(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  if (useSupabase) {
    const { data, error } = await db().from("coupons").select("*").eq("code", normalized).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? couponFromRow(data as CouponRow) : null;
  }
  return (await readCommerce()).coupons.find((c) => c.code === normalized) ?? null;
}

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db().from("coupons").insert(couponToRow(input)).select("*").single();
    if (error) throw dbError(error, DUP_COUPON);
    return couponFromRow(data as CouponRow);
  }
  return localMutation(async () => {
    const commerce = await readCommerce();
    if (commerce.coupons.some((c) => c.code === input.code)) throw new Error(DUP_COUPON);
    const now = new Date().toISOString();
    const coupon: Coupon = { ...input, id: crypto.randomUUID(), redemptions: 0, createdAt: now, updatedAt: now };
    commerce.coupons.unshift(coupon);
    await writeCommerce(commerce);
    return coupon;
  });
}

export async function updateCoupon(id: string, input: CouponInput): Promise<Coupon> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db().from("coupons").update({ ...couponToRow(input), updated_at: new Date().toISOString() })
      .eq("id", id).select("*").maybeSingle();
    if (error) throw dbError(error, DUP_COUPON);
    if (!data) throw new Error("Coupon not found.");
    return couponFromRow(data as CouponRow);
  }
  return localMutation(async () => {
    const commerce = await readCommerce();
    const index = commerce.coupons.findIndex((c) => c.id === id);
    if (index < 0) throw new Error("Coupon not found.");
    if (commerce.coupons.some((c) => c.id !== id && c.code === input.code)) throw new Error(DUP_COUPON);
    commerce.coupons[index] = { ...commerce.coupons[index], ...input, updatedAt: new Date().toISOString() };
    await writeCommerce(commerce);
    return commerce.coupons[index];
  });
}

export async function deleteCoupon(id: string): Promise<void> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db().from("coupons").delete().eq("id", id).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("Coupon not found.");
    return;
  }
  return localMutation(async () => {
    const commerce = await readCommerce();
    if (!commerce.coupons.some((c) => c.id === id)) throw new Error("Coupon not found.");
    commerce.coupons = commerce.coupons.filter((c) => c.id !== id);
    await writeCommerce(commerce);
  });
}

/* -------------------------------- Orders ------------------------------- */

type OrderRow = {
  id: string; reference: string; customer_name: string; customer_email: string; customer_phone: string;
  shipping_address: string; shipping_city: string; shipping_state: string; notes: string;
  subtotal_ngn: number; discount_ngn: number; delivery_ngn: number; total_ngn: number; coupon_code: string | null;
  status: OrderStatus; payment_status: Order["paymentStatus"]; payment_reference: string | null; paid_at: string | null;
  stock_deducted: boolean; coupon_redeemed: boolean; created_at: string; updated_at: string;
  order_items?: ItemRow[];
};
type ItemRow = {
  id: string; product_id: string | null; sku: string; name: string; image_src: string;
  price_ngn: number; quantity_kg: number; line_total_ngn: number;
};
const orderFromRow = (r: OrderRow): Order => ({
  id: r.id, reference: r.reference, customerName: r.customer_name, customerEmail: r.customer_email,
  customerPhone: r.customer_phone, shippingAddress: r.shipping_address, shippingCity: r.shipping_city,
  shippingState: r.shipping_state, notes: r.notes, subtotalNgn: r.subtotal_ngn, discountNgn: r.discount_ngn,
  deliveryNgn: r.delivery_ngn, totalNgn: r.total_ngn, couponCode: r.coupon_code, status: r.status,
  paymentStatus: r.payment_status, paymentReference: r.payment_reference, paidAt: r.paid_at,
  stockDeducted: r.stock_deducted, couponRedeemed: r.coupon_redeemed, createdAt: r.created_at, updatedAt: r.updated_at,
  items: (r.order_items ?? []).map((i) => ({
    id: i.id, productId: i.product_id, sku: i.sku, name: i.name, imageSrc: i.image_src,
    priceNgn: i.price_ngn, quantityKg: i.quantity_kg, lineTotalNgn: i.line_total_ngn
  }))
});

export const deliveryFeeNgn = () => {
  const fee = Number(process.env.DELIVERY_FEE_NGN ?? 0);
  return Number.isInteger(fee) && fee >= 0 ? fee : 0;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newReference() {
  const bytes = randomBytes(8);
  return `CUL-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

export type Quote = {
  items: OrderItem[]; subtotalNgn: number; discountNgn: number; deliveryNgn: number; totalNgn: number;
  coupon: Coupon | null; couponError: string | null;
};

/** Prices an order from trusted server data only. Throws on unavailable products or stock. */
export async function quoteOrder(items: CheckoutInput["items"], couponCode?: string): Promise<Quote> {
  const products = await allProducts();
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantityKg);
  const lines: OrderItem[] = [];
  for (const [productId, quantityKg] of merged) {
    const p = products.find((x) => x.id === productId);
    if (!p) throw new Error("One of the products in your cart is no longer available.");
    if (quantityKg < p.minOrderKg) throw new Error(`${p.name} has a minimum order of ${p.minOrderKg}kg.`);
    if (quantityKg > p.stockKg) throw new Error(`Only ${p.stockKg}kg of ${p.name} is available right now.`);
    lines.push({
      id: crypto.randomUUID(), productId: p.id, sku: p.sku, name: p.name, imageSrc: p.imageSrc,
      priceNgn: p.priceNgn, quantityKg, lineTotalNgn: p.priceNgn * quantityKg
    });
  }
  const subtotalNgn = lines.reduce((s, l) => s + l.lineTotalNgn, 0);
  let coupon: Coupon | null = null; let couponError: string | null = null; let discountNgn = 0;
  if (couponCode) {
    const found = await couponByCode(couponCode);
    const result = evaluateCoupon(found, subtotalNgn);
    if (result.ok) { coupon = found; discountNgn = result.discountNgn; } else couponError = result.error;
  }
  const deliveryNgn = deliveryFeeNgn();
  return { items: lines, subtotalNgn, discountNgn, deliveryNgn, totalNgn: subtotalNgn - discountNgn + deliveryNgn, coupon, couponError };
}

export async function createOrder(input: CheckoutInput, quote: Quote): Promise<Order> {
  assertStorageConfigured();
  const now = new Date().toISOString();
  const order: Order = {
    id: crypto.randomUUID(), reference: newReference(),
    customerName: input.customer.name, customerEmail: input.customer.email, customerPhone: input.customer.phone,
    shippingAddress: input.customer.address, shippingCity: input.customer.city, shippingState: input.customer.state,
    notes: input.customer.notes, subtotalNgn: quote.subtotalNgn, discountNgn: quote.discountNgn,
    deliveryNgn: quote.deliveryNgn, totalNgn: quote.totalNgn, couponCode: quote.coupon?.code ?? null,
    status: "pending", paymentStatus: "unpaid", paymentReference: null, paidAt: null,
    stockDeducted: false, couponRedeemed: false, createdAt: now, updatedAt: now, items: quote.items
  };
  if (useSupabase) {
    const { error } = await db().from("orders").insert({
      id: order.id, reference: order.reference, customer_name: order.customerName, customer_email: order.customerEmail,
      customer_phone: order.customerPhone, shipping_address: order.shippingAddress, shipping_city: order.shippingCity,
      shipping_state: order.shippingState, notes: order.notes, subtotal_ngn: order.subtotalNgn,
      discount_ngn: order.discountNgn, delivery_ngn: order.deliveryNgn, total_ngn: order.totalNgn,
      coupon_code: order.couponCode
    });
    if (error) throw new Error(`Could not create order: ${error.message}`);
    const { error: itemsError } = await db().from("order_items").insert(order.items.map((i) => ({
      id: i.id, order_id: order.id, product_id: i.productId, sku: i.sku, name: i.name, image_src: i.imageSrc,
      price_ngn: i.priceNgn, quantity_kg: i.quantityKg, line_total_ngn: i.lineTotalNgn
    })));
    if (itemsError) {
      await db().from("orders").delete().eq("id", order.id);
      throw new Error(`Could not create order: ${itemsError.message}`);
    }
    return order;
  }
  return localMutation(async () => {
    const commerce = await readCommerce();
    commerce.orders.unshift(order);
    await writeCommerce(commerce);
    return order;
  });
}

export async function allOrders(): Promise<Order[]> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db().from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(`Unable to fetch orders: ${error.message}`);
    return ((data ?? []) as OrderRow[]).map(orderFromRow);
  }
  return (await readCommerce()).orders;
}

export async function orderBy(field: "id" | "reference", value: string): Promise<Order | null> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db().from("orders").select("*, order_items(*)").eq(field, value).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? orderFromRow(data as OrderRow) : null;
  }
  return (await readCommerce()).orders.find((o) => o[field] === value) ?? null;
}

export async function setPaymentReference(orderId: string, paymentReference: string) {
  if (useSupabase) {
    const { error } = await db().from("orders").update({ payment_reference: paymentReference, updated_at: new Date().toISOString() }).eq("id", orderId);
    if (error) throw new Error(error.message);
    return;
  }
  await localMutation(async () => {
    const commerce = await readCommerce();
    const order = commerce.orders.find((o) => o.id === orderId);
    if (order) { order.paymentReference = paymentReference; order.updatedAt = new Date().toISOString(); }
    await writeCommerce(commerce);
  });
}

/**
 * Idempotently marks an order paid and redeems its coupon once.
 * `amountNgn` (when provided, e.g. from Paystack) must equal the order total.
 */
export async function markOrderPaid(orderId: string, paymentReference: string | null, amountNgn: number | null): Promise<void> {
  assertStorageConfigured();
  if (useSupabase) {
    const { error } = await db().rpc("mark_order_paid", { p_order_id: orderId, p_reference: paymentReference, p_amount_ngn: amountNgn });
    if (error) throw dbError(error);
    return;
  }
  await localMutation(async () => {
    const commerce = await readCommerce();
    const order = commerce.orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus === "paid") return;
    if (amountNgn !== null && amountNgn !== order.totalNgn) throw new Error("Paid amount does not match order total");
    const now = new Date().toISOString();
    Object.assign(order, { paymentStatus: "paid", paidAt: now, updatedAt: now, paymentReference: paymentReference ?? order.paymentReference });
    if (order.couponCode && !order.couponRedeemed) {
      const coupon = commerce.coupons.find((c) => c.code === order.couponCode);
      if (coupon) coupon.redemptions += 1;
      order.couponRedeemed = true;
    }
    await writeCommerce(commerce);
  });
}

export async function markOrderPaymentFailed(orderId: string) {
  if (useSupabase) {
    await db().from("orders").update({ payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", orderId).eq("payment_status", "unpaid");
    return;
  }
  await localMutation(async () => {
    const commerce = await readCommerce();
    const order = commerce.orders.find((o) => o.id === orderId);
    if (order && order.paymentStatus === "unpaid") { order.paymentStatus = "failed"; order.updatedAt = new Date().toISOString(); }
    await writeCommerce(commerce);
  });
}

/**
 * Moves an order through fulfilment. Stock is deducted (atomically, all-or-nothing) the first
 * time an order reaches confirmed/shipped/delivered, and returned if a deducted order is cancelled.
 */
export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  assertStorageConfigured();
  if (useSupabase) {
    const { error } = await db().rpc("set_order_status", { p_order_id: orderId, p_status: status });
    if (error) throw dbError(error);
    return;
  }
  await localMutation(async () => {
    const [items, commerce] = await Promise.all([readLocal(), readCommerce()]);
    const order = commerce.orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === status) return;
    if (order.status === "cancelled") throw new Error("Cancelled orders cannot be reopened");
    if (status === "pending") throw new Error("Orders cannot be moved back to pending");
    // Work on copies so a failed line leaves stock untouched (all-or-nothing).
    const draftItems = structuredClone(items); const draftCommerce = structuredClone(commerce);
    const draftOrder = draftCommerce.orders.find((o) => o.id === orderId)!;
    if (status !== "cancelled" && !draftOrder.stockDeducted) {
      for (const line of draftOrder.items) {
        if (line.productId) applyLocalStock(draftItems, draftCommerce, line.productId, -line.quantityKg, "order", draftOrder.reference, orderId);
      }
      draftOrder.stockDeducted = true;
    } else if (status === "cancelled" && draftOrder.stockDeducted) {
      for (const line of draftOrder.items) {
        if (line.productId && draftItems.some((p) => p.id === line.productId)) {
          applyLocalStock(draftItems, draftCommerce, line.productId, line.quantityKg, "order_cancelled", draftOrder.reference, orderId);
        }
      }
      draftOrder.stockDeducted = false;
    }
    draftOrder.status = status;
    draftOrder.updatedAt = new Date().toISOString();
    await writeLocal(draftItems);
    await writeCommerce(draftCommerce);
  });
}

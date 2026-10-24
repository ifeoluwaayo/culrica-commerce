import "server-only";
import { randomBytes } from "node:crypto";
import type { Order } from "./commerce";
import { markOrderPaid, markOrderPaymentFailed, orderBy, setOrderStatus, setPaymentReference } from "./orders";
import { initializeTransaction, orderReferenceFromPayment, paystackConfigured, verifyTransaction } from "./paystack";

export const MIN_ONLINE_PAYMENT_NGN = 100;

function siteOrigin(req: Request) {
  return process.env.SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin;
}

/** Creates a fresh Paystack checkout for an unpaid order and returns the hosted payment URL. */
export async function startPayment(order: Order, req: Request) {
  if (!paystackConfigured()) throw new Error("Online payments are not configured yet. Add PAYSTACK_SECRET_KEY on the server.");
  if (order.paymentStatus === "paid") throw new Error("This order has already been paid.");
  if (order.status === "cancelled") throw new Error("This order was cancelled.");
  if (order.totalNgn < MIN_ONLINE_PAYMENT_NGN) throw new Error("Order total is too low for online payment.");
  const paymentReference = `${order.reference}-${randomBytes(3).toString("hex")}`;
  const tx = await initializeTransaction({
    email: order.customerEmail, amountNgn: order.totalNgn, reference: paymentReference,
    callbackUrl: `${siteOrigin(req)}/checkout/complete`,
    metadata: { order_id: order.id, order_reference: order.reference }
  });
  await setPaymentReference(order.id, paymentReference);
  return tx.authorization_url;
}

/**
 * Verifies a payment with Paystack's API (never trusting the redirect alone) and marks the order paid.
 * Automatically confirms the order (moving from pending to confirmed and deducting inventory stock).
 * Safe to call repeatedly from the redirect page and the webhook.
 */
export async function confirmPayment(paymentReference: string): Promise<Order | null> {
  const orderReference = orderReferenceFromPayment(paymentReference);
  if (!orderReference) return null;
  const order = await orderBy("reference", orderReference);
  if (!order) return null;
  if (order.paymentStatus === "paid" || !paystackConfigured()) return order;
  const tx = await verifyTransaction(paymentReference);
  if (tx.status === "success") {
    if (tx.currency !== "NGN" || tx.amount !== order.totalNgn * 100 || tx.reference !== paymentReference) {
      throw new Error("Payment details did not match this order. Please contact support.");
    }
    await markOrderPaid(order.id, paymentReference, tx.amount / 100);
    // Auto-confirm the order and deduct stock upon payment confirmation
    if (order.status === "pending") {
      try {
        await setOrderStatus(order.id, "confirmed");
      } catch (err) {
        console.error("Auto-confirming order failed:", err);
      }
    }
  } else if (tx.status === "failed" || tx.status === "abandoned") {
    await markOrderPaymentFailed(order.id);
  }
  return orderBy("id", order.id);
}

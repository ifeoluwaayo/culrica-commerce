import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paystack.co";

export function paystackConfigured() { return Boolean(process.env.PAYSTACK_SECRET_KEY); }
export function paystackTestMode() { return (process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_test_"); }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store"
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== true) throw new Error(body.message || `Paystack request failed (${res.status})`);
  return body.data as T;
}

/** Amounts are passed to Paystack in kobo. */
export function initializeTransaction(args: { email: string; amountNgn: number; reference: string; callbackUrl: string; metadata?: Record<string, unknown> }) {
  return call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: args.email, amount: args.amountNgn * 100, currency: "NGN", reference: args.reference,
      callback_url: args.callbackUrl, metadata: args.metadata
    })
  });
}

export type VerifiedTransaction = { status: string; reference: string; amount: number; currency: string; paid_at: string | null };
export function verifyTransaction(reference: string) {
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function validWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Payment references look like CUL-XXXXXXXX-ab12 so retries never collide; the order reference is the prefix. */
export function orderReferenceFromPayment(paymentReference: string) {
  const match = /^(CUL-[A-Z0-9]{8})(?:-[a-z0-9]+)?$/.exec(paymentReference);
  return match?.[1] ?? null;
}

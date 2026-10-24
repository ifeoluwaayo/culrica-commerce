import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/payments";
import { validWebhookSignature } from "@/lib/paystack";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook. The signature proves the call came from Paystack; we still re-verify the
 * transaction via the API before marking anything paid. Always 200 for valid signatures so
 * Paystack does not retry events we intentionally ignore.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  try {
    const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
    if (event.event === "charge.success" && event.data?.reference) await confirmPayment(event.data.reference);
  } catch (error) {
    console.error("Paystack webhook processing failed", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

import { checkoutSchema } from "@/lib/commerce";
import { createOrder, quoteOrder } from "@/lib/orders";
import { startPayment } from "@/lib/payments";
import { paystackConfigured } from "@/lib/paystack";
import { errorMessage, json, readJson } from "@/lib/api";
import { validOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Creates a pending order from trusted server prices, then hands off to Paystack checkout. */
export async function POST(req: Request) {
  if (!validOrigin(req)) return json({ error: "Invalid request origin" }, 403);
  if (!paystackConfigured()) return json({ error: "Online payments are not configured yet. Please try again later." }, 503);
  const parsed = checkoutSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return json({ error: first ? `${first.path.join(".") || "Request"}: ${first.message}` : "Invalid checkout details" }, 400);
  }
  try {
    const quote = await quoteOrder(parsed.data.items, parsed.data.couponCode);
    if (parsed.data.couponCode && quote.couponError) return json({ error: quote.couponError }, 400);
    const order = await createOrder(parsed.data, quote);
    const authorizationUrl = await startPayment(order, req);
    return json({ reference: order.reference, authorizationUrl }, 201);
  } catch (error) {
    return json({ error: errorMessage(error, "Could not place your order") }, 400);
  }
}

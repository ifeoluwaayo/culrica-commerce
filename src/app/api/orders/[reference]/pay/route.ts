import { orderBy } from "@/lib/orders";
import { startPayment } from "@/lib/payments";
import { errorMessage, json } from "@/lib/api";
import { validOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Starts a new Paystack attempt for an unpaid order (e.g. after an abandoned or failed payment). */
export async function POST(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!validOrigin(req)) return json({ error: "Invalid request origin" }, 403);
  const order = await orderBy("reference", (await params).reference).catch(() => null);
  if (!order) return json({ error: "Order not found" }, 404);
  try {
    return json({ authorizationUrl: await startPayment(order, req) });
  } catch (error) {
    return json({ error: errorMessage(error, "Could not start payment") }, 400);
  }
}

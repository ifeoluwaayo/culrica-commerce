import { z } from "zod";
import { quoteOrder } from "@/lib/orders";
import { errorMessage, json, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().trim().min(1).max(32),
  items: z.array(z.object({ productId: z.string().uuid(), quantityKg: z.coerce.number().int().min(1).max(1000000) })).min(1).max(50)
});

/** Previews a coupon against the cart using server prices. Does not reserve or redeem the code. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Enter a code and add items to your cart." }, 400);
  try {
    const quote = await quoteOrder(parsed.data.items, parsed.data.code);
    if (quote.couponError || !quote.coupon) return json({ error: quote.couponError ?? "That code isn't valid." }, 400);
    return json({
      code: quote.coupon.code, description: quote.coupon.description,
      subtotalNgn: quote.subtotalNgn, discountNgn: quote.discountNgn, deliveryNgn: quote.deliveryNgn, totalNgn: quote.totalNgn
    });
  } catch (error) {
    return json({ error: errorMessage(error, "Could not check that code") }, 400);
  }
}

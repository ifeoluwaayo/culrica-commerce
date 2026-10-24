import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, validOrigin } from "@/lib/auth";
import { markOrderPaid, orderBy, setOrderStatus } from "@/lib/orders";
import { orderStatuses } from "@/lib/commerce";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(orderStatuses).optional(),
  markPaid: z.boolean().optional()
}).refine((d) => d.status !== undefined || d.markPaid !== undefined, "Nothing to update");

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const { id } = await params;
  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }
    if (parsed.data.markPaid) {
      await markOrderPaid(id, "admin-confirmed", null);
    }
    if (parsed.data.status) {
      await setOrderStatus(id, parsed.data.status);
    }
    const order = await orderBy("id", id);
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update order" }, { status: 400 });
  }
}

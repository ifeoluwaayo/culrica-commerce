import { NextResponse } from "next/server";
import { isAdmin, validOrigin } from "@/lib/auth";
import { deleteCoupon, updateCoupon } from "@/lib/orders";
import { couponSchema } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const parsed = couponSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid coupon data", details: parsed.error.flatten() }, { status: 400 });
    }
    const coupon = await updateCoupon((await params).id, parsed.data);
    return NextResponse.json({ coupon });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update coupon" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    await deleteCoupon((await params).id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete coupon" }, { status: 400 });
  }
}

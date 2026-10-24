import { NextResponse } from "next/server";
import { isAdmin, validOrigin } from "@/lib/auth";
import { allCoupons, createCoupon } from "@/lib/orders";
import { couponSchema } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ coupons: await allCoupons() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to retrieve coupons" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const parsed = couponSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid coupon data", details: parsed.error.flatten() }, { status: 400 });
    }
    const coupon = await createCoupon(parsed.data);
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create coupon" }, { status: 400 });
  }
}

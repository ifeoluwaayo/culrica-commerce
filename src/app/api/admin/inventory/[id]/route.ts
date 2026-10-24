import { NextResponse } from "next/server";
import { isAdmin, validOrigin } from "@/lib/auth";
import { adjustStock } from "@/lib/store";
import { stockAdjustmentSchema } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const parsed = stockAdjustmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid adjustment data", details: parsed.error.flatten() }, { status: 400 });
    }
    const product = await adjustStock((await params).id, parsed.data.deltaKg, parsed.data.reason, parsed.data.note);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not adjust stock" }, { status: 400 });
  }
}

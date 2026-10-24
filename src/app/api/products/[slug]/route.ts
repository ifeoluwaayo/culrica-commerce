import { NextResponse } from "next/server";
import { publicProduct } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const product = await publicProduct((await params).slug);
    return product ? NextResponse.json({ product }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ error: "Product not found" }, { status: 404 });
  } catch { return NextResponse.json({ error: "Unable to fetch product" }, { status: 500 }); }
}

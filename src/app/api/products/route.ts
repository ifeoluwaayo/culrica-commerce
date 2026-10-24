import { NextResponse } from "next/server";
import { allProducts } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ products: await allProducts() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Unable to retrieve catalogue" }, { status: 500 }); }
}

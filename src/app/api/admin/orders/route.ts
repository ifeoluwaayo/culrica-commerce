import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { allOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ orders: await allOrders() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to retrieve orders" }, { status: 500 });
  }
}

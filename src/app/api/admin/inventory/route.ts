import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { inventoryMovements } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ movements: await inventoryMovements() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to retrieve movements" }, { status: 500 });
  }
}

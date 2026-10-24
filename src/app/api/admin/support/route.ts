import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { allSupportTickets } from "@/lib/support";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ tickets: await allSupportTickets() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to retrieve support tickets" }, { status: 500 });
  }
}

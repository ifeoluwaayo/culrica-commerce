import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, validOrigin } from "@/lib/auth";
import { updateSupportTicketStatus } from "@/lib/support";
import { ticketStatuses } from "@/lib/commerce";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(ticketStatuses)
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status update", details: parsed.error.flatten() }, { status: 400 });
    }
    const ticket = await updateSupportTicketStatus(id, parsed.data.status);
    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update support ticket" }, { status: 400 });
  }
}

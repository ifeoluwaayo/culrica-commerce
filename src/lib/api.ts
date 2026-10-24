import "server-only";
import { NextResponse } from "next/server";
import { isAdmin, validOrigin } from "./auth";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Returns an error response when the caller is not a signed-in admin (or the write is cross-origin). */
export async function adminGuard(req: Request, write = true) {
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  if (write && !validOrigin(req)) return json({ error: "Invalid request origin" }, 403);
  return null;
}

export const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { return null; }
}

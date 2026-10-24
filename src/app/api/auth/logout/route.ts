import { NextResponse } from "next/server";
import { validOrigin, sessionName } from "@/lib/auth";
export async function POST(req: Request) {
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionName, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}

import { NextResponse } from "next/server";
import { credentialsConfigured, sessionCookie, sessionMaxAge, sessionName, validOrigin, verifyPassword } from "@/lib/auth";
export async function POST(req: Request) {
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!credentialsConfigured()) return NextResponse.json({ error: "Configure ADMIN_PASSWORD and SESSION_SECRET first." }, { status: 503 });
  let password: unknown;
  try { ({ password } = await req.json()); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (typeof password !== "string" || !verifyPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionName, sessionCookie(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionMaxAge
  });
  return response;
}

import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "culrica_admin";
const MAX_AGE = 60 * 60 * 12;
const devSecret = randomBytes(32).toString("hex");

function secret() { return process.env.SESSION_SECRET || (process.env.NODE_ENV !== "production" ? devSecret : ""); }
function password() { return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== "production" ? "culrica-demo-2026" : ""); }
function digest(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function credentialsConfigured() { return Boolean(secret() && password()); }
export function verifyPassword(submitted: string) {
  return credentialsConfigured() && safeEqual(digest(submitted), digest(password()));
}
export function sessionCookie() {
  const exp = Date.now() + MAX_AGE * 1000;
  const nonce = randomBytes(12).toString("hex");
  const payload = `${exp}.${nonce}`;
  return `${payload}.${digest(payload)}`;
}
export async function isAdmin() {
  if (!credentialsConfigured()) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value ?? "";
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0])) return false;
  const exp = Number(parts[0]);
  if (exp < Date.now() || exp > Date.now() + MAX_AGE * 1000) return false;
  return safeEqual(parts[2], digest(`${parts[0]}.${parts[1]}`));
}
export const sessionName = COOKIE;
export const sessionMaxAge = MAX_AGE;
export function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients without Origin still require a signed session
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

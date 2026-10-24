import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seededProducts, type Product } from "./products";
import type { Coupon, InventoryMovement, Order } from "./commerce";

/**
 * Storage plumbing shared by products, inventory, orders and coupons.
 * Supabase (service role, server only) in production; JSON files under data/ for local development.
 */
export const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export function assertStorageConfigured() {
  if (process.env.NODE_ENV === "production" && !useSupabase) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for production storage.");
  }
}

let cached: SupabaseClient | null = null;
export function db() {
  if (!useSupabase) throw new Error("Supabase not configured");
  cached ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}

/** Postgres raises our business-rule errors with RAISE EXCEPTION; surface just the message. */
export function dbError(error: { message: string; code?: string }, duplicate = "That record already exists.") {
  return new Error(error.code === "23505" ? duplicate : error.message);
}

/* --------------------------- Local adapter --------------------------- */

const dataDir = path.join(process.cwd(), "data");
const productsFile = path.join(dataDir, "products.json");
const commerceFile = path.join(dataDir, "commerce.json");

export type LocalCommerce = { coupons: Coupon[]; orders: Order[]; movements: InventoryMovement[]; tickets: import("./commerce").SupportTicket[] };

async function readJson<T>(file: string, seed: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, "utf8")) as T; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await fs.mkdir(dataDir, { recursive: true });
    try { await fs.writeFile(file, JSON.stringify(seed, null, 2), { flag: "wx" }); }
    catch (writeError) { if ((writeError as NodeJS.ErrnoException).code !== "EEXIST") throw writeError; }
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  }
}
async function writeJson(file: string, value: unknown) {
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2));
  await fs.rename(temp, file);
}

export const readLocal = () => readJson<Product[]>(productsFile, seededProducts);
export const writeLocal = (items: Product[]) => writeJson(productsFile, items);
export const readCommerce = () => readJson<LocalCommerce>(commerceFile, { coupons: [], orders: [], movements: [], tickets: [] });

export const writeCommerce = (value: LocalCommerce) => writeJson(commerceFile, value);

// The local file adapter is for single-process development only. Supabase is mandatory in production.
let writeQueue: Promise<unknown> = Promise.resolve();
export async function localMutation<T>(task: () => Promise<T>): Promise<T> {
  const current = writeQueue.then(task, task);
  writeQueue = current.catch(() => undefined);
  return current;
}

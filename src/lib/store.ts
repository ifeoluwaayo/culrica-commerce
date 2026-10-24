import "server-only";
import { imageForCategory, type Product, type ProductInput, slugify } from "./products";
import type { InventoryMovement, MovementReason } from "./commerce";
import { assertStorageConfigured, db, dbError, localMutation, readCommerce, readLocal, useSupabase, writeCommerce, writeLocal, type LocalCommerce } from "./db";

type Row = {
  id: string; sku: string; slug: string; name: string; tagline: string; description: string;
  category: Product["category"]; origin: string; price_ngn: number; stock_kg: number;
  min_order_kg: number; image_src: string; is_active: boolean; is_featured: boolean; updated_at: string;
};
function fromRow(r: Row): Product {
  return {
    id: r.id, sku: r.sku, slug: r.slug, name: r.name, tagline: r.tagline,
    description: r.description, category: r.category, origin: r.origin,
    priceNgn: r.price_ngn, stockKg: r.stock_kg, minOrderKg: r.min_order_kg,
    imageSrc: r.image_src, isActive: r.is_active, isFeatured: r.is_featured, updatedAt: r.updated_at
  };
}

type MovementRow = {
  id: string; product_id: string | null; sku: string; product_name: string; delta_kg: number;
  stock_after_kg: number; reason: MovementReason; note: string; order_id: string | null; created_at: string;
};
const movementFromRow = (r: MovementRow): InventoryMovement => ({
  id: r.id, productId: r.product_id, sku: r.sku, productName: r.product_name, deltaKg: r.delta_kg,
  stockAfterKg: r.stock_after_kg, reason: r.reason, note: r.note, orderId: r.order_id, createdAt: r.created_at
});

const DUPLICATE = "SKU or product name already exists.";

export function storeMode() { return useSupabase ? "Supabase" : "Local demo"; }

export async function allProducts(includeInactive = false): Promise<Product[]> {
  assertStorageConfigured();
  let items: Product[];
  if (useSupabase) {
    const { data, error } = await db().from("products").select("*").order("created_at", { ascending: true });
    if (error) throw new Error(`Unable to fetch products: ${error.message}`);
    items = ((data ?? []) as Row[]).map(fromRow);
  } else items = await readLocal();
  return items.filter((p) => includeInactive || p.isActive);
}
export async function publicProduct(slug: string) {
  return (await allProducts()).find((p) => p.slug === slug) ?? null;
}

function resolvedImage(input: ProductInput) {
  return input.imageSrc?.trim() || imageForCategory(input.category);
}

/** Records a movement and mutates the in-memory local product list. Caller persists both files. */
export function applyLocalStock(
  items: Product[], commerce: LocalCommerce, productId: string, deltaKg: number,
  reason: MovementReason, note = "", orderId: string | null = null
) {
  const product = items.find((p) => p.id === productId);
  if (!product) throw new Error("Product not found.");
  if (product.stockKg + deltaKg < 0) {
    throw new Error(reason === "order" ? `Not enough stock for ${product.name} to confirm this order` : "Stock cannot go below zero");
  }
  product.stockKg += deltaKg;
  product.updatedAt = new Date().toISOString();
  commerce.movements.unshift({
    id: crypto.randomUUID(), productId, sku: product.sku, productName: product.name, deltaKg,
    stockAfterKg: product.stockKg, reason, note, orderId, createdAt: new Date().toISOString()
  });
  return product;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  assertStorageConfigured();
  const now = new Date().toISOString();
  const p: Product = {
    ...input, id: crypto.randomUUID(), slug: slugify(input.name), stockKg: 0,
    imageSrc: resolvedImage(input), updatedAt: now
  };
  if (!p.slug) throw new Error("Please use a product name containing letters or numbers.");
  if (useSupabase) {
    const { error } = await db().from("products").insert({
      id: p.id, sku: p.sku, slug: p.slug, name: p.name, tagline: p.tagline, description: p.description,
      category: p.category, origin: p.origin, price_ngn: p.priceNgn, stock_kg: 0, min_order_kg: p.minOrderKg,
      image_src: p.imageSrc, is_active: p.isActive, is_featured: p.isFeatured, updated_at: p.updatedAt
    });
    if (error) throw dbError(error, DUPLICATE);
    if (input.stockKg > 0) await adjustStock(p.id, input.stockKg, "initial", "Opening stock");
    return (await productById(p.id))!;
  }
  return localMutation(async () => {
    const [items, commerce] = await Promise.all([readLocal(), readCommerce()]);
    if (items.some((x) => x.sku === p.sku || x.slug === p.slug)) throw new Error(DUPLICATE);
    items.push(p);
    if (input.stockKg > 0) applyLocalStock(items, commerce, p.id, input.stockKg, "initial", "Opening stock");
    await writeLocal(items);
    await writeCommerce(commerce);
    return p;
  });
}

async function productById(id: string) {
  if (useSupabase) {
    const { data, error } = await db().from("products").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data as Row) : null;
  }
  return (await readLocal()).find((p) => p.id === id) ?? null;
}

/**
 * Updates catalogue fields. Stock changes made in the product form are logged as an
 * "adjustment" movement so the inventory history stays complete.
 */
export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  assertStorageConfigured();
  const slug = slugify(input.name);
  if (!slug) throw new Error("Please use a product name containing letters or numbers.");
  const updatedAt = new Date().toISOString();
  if (useSupabase) {
    const current = await productById(id);
    if (!current) throw new Error("Product not found.");
    const { error } = await db().from("products").update({
      sku: input.sku, slug, name: input.name, tagline: input.tagline, description: input.description,
      category: input.category, origin: input.origin, price_ngn: input.priceNgn, min_order_kg: input.minOrderKg,
      image_src: resolvedImage(input), is_active: input.isActive, is_featured: input.isFeatured, updated_at: updatedAt
    }).eq("id", id);
    if (error) throw dbError(error, DUPLICATE);
    const delta = input.stockKg - current.stockKg;
    if (delta !== 0) await adjustStock(id, delta, "adjustment", "Edited in product form");
    return (await productById(id))!;
  }
  return localMutation(async () => {
    const [items, commerce] = await Promise.all([readLocal(), readCommerce()]);
    const index = items.findIndex((x) => x.id === id);
    if (index < 0) throw new Error("Product not found.");
    if (items.some((x) => x.id !== id && (x.sku === input.sku || x.slug === slug))) throw new Error(DUPLICATE);
    const { stockKg, ...fields } = input;
    const delta = stockKg - items[index].stockKg;
    items[index] = { ...items[index], ...fields, slug, imageSrc: resolvedImage(input), updatedAt };
    if (delta !== 0) applyLocalStock(items, commerce, id, delta, "adjustment", "Edited in product form");
    await writeLocal(items);
    await writeCommerce(commerce);
    return items[index];
  });
}

/** Permanently removes a product. Past orders keep their own snapshot of name, SKU and price. */
export async function deleteProduct(id: string): Promise<void> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db().from("products").delete().eq("id", id).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("Product not found.");
    return;
  }
  return localMutation(async () => {
    const [items, commerce] = await Promise.all([readLocal(), readCommerce()]);
    if (!items.some((p) => p.id === id)) throw new Error("Product not found.");
    for (const order of commerce.orders) for (const item of order.items) if (item.productId === id) item.productId = null;
    for (const m of commerce.movements) if (m.productId === id) m.productId = null;
    await writeLocal(items.filter((p) => p.id !== id));
    await writeCommerce(commerce);
  });
}

/* ------------------------------ Inventory ------------------------------ */

export async function adjustStock(productId: string, deltaKg: number, reason: MovementReason, note = ""): Promise<Product> {
  assertStorageConfigured();
  if (useSupabase) {
    const { error } = await db().rpc("adjust_stock", { p_product_id: productId, p_delta: deltaKg, p_reason: reason, p_note: note });
    if (error) throw dbError(error);
    return (await productById(productId))!;
  }
  return localMutation(async () => {
    const [items, commerce] = await Promise.all([readLocal(), readCommerce()]);
    const product = applyLocalStock(items, commerce, productId, deltaKg, reason, note);
    await writeLocal(items);
    await writeCommerce(commerce);
    return product;
  });
}

export async function inventoryMovements(limit = 200): Promise<InventoryMovement[]> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db().from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(`Unable to fetch inventory history: ${error.message}`);
    return ((data ?? []) as MovementRow[]).map(movementFromRow);
  }
  return (await readCommerce()).movements.slice(0, limit);
}

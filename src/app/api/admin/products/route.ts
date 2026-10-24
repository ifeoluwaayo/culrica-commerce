import { NextResponse } from "next/server";
import { isAdmin, validOrigin } from "@/lib/auth";
import { allProducts, createProduct } from "@/lib/store";
import { productSchema } from "@/lib/products";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ products: await allProducts(true) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Unable to retrieve products" }, { status: 500 }); }
}
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const parsed = productSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid product data", details: parsed.error.flatten() }, { status: 400 });
    return NextResponse.json({ product: await createProduct(parsed.data) }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create product" }, { status: 400 }); }
}

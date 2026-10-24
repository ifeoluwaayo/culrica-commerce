import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BadgeCheck, CheckCircle2, ChevronRight, Leaf, MapPin, Package, ShieldCheck, Sparkles } from "lucide-react";
import { publicProduct, allProducts } from "@/lib/store";
import { naira, LOW_STOCK_KG } from "@/lib/products";
import { QuantityEstimate } from "@/components/quantity-estimate";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) return { title: "Produce Not Found" };
  return {
    title: `${product.name} (Wholesale)`,
    description: `${product.tagline} Sourced from ${product.origin}. Available in whole-kilogram wholesale lots at ${naira(product.priceNgn)}/kg.`
  };
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) notFound();

  const otherProducts = (await allProducts()).filter((p) => p.id !== product.id).slice(0, 3);

  const isLowStock = product.stockKg > 0 && product.stockKg <= LOW_STOCK_KG;
  const isOutOfStock = product.stockKg === 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f8f4]">
      <SiteHeader />

      <main className="flex-1 pb-24">
        {/* Breadcrumb row */}
        <div className="border-b border-[#e8e5dc] bg-[#faf9f5]">
          <div className="container-main py-4 flex items-center gap-2 text-xs text-[#6e7a70]">
            <Link href="/" className="hover:text-[#101c14] transition">
              Home
            </Link>
            <ChevronRight size={13} className="text-[#a5b2a7]" />
            <Link href="/#catalogue" className="hover:text-[#101c14] transition">
              Produce Catalogue
            </Link>
            <ChevronRight size={13} className="text-[#a5b2a7]" />
            <span className="text-[#101c14] font-medium truncate">{product.name}</span>
          </div>
        </div>

        {/* Product Details Hero */}
        <div className="container-main pt-8 lg:pt-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-start">
            {/* Left: Product Image & Gallery Display */}
            <div className="space-y-4">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-[32px] bg-[#f0ece1] border border-[#e2ded4] shadow-md">
                <Image
                  src={product.imageSrc}
                  alt={product.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />

                <div className="absolute left-5 top-5 flex items-center gap-2">
                  <span className="rounded-full bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#143522] shadow-xs">
                    {product.category}
                  </span>
                  {product.isFeatured && (
                    <span className="rounded-full bg-[#143522] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs">
                      ★ Featured
                    </span>
                  )}
                </div>

                <div className="absolute bottom-5 right-5">
                  <span
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold backdrop-blur-md shadow-xs ${
                      isOutOfStock
                        ? "bg-red-100/90 text-red-800"
                        : isLowStock
                        ? "bg-amber-100/90 text-amber-800"
                        : "bg-emerald-100/90 text-emerald-900"
                    }`}
                  >
                    {isOutOfStock
                      ? "Sold Out"
                      : isLowStock
                      ? `Low Stock: ${product.stockKg} kg remaining`
                      : `${product.stockKg} kg in stock`}
                  </span>
                </div>
              </div>

              {/* Provenance Feature Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#e2ded4] bg-white p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7a70]">Origin Hub</span>
                  <p className="mt-1 font-bold text-xs text-[#101c14] truncate">{product.origin}</p>
                </div>
                <div className="rounded-2xl border border-[#e2ded4] bg-white p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7a70]">Sorting Grade</span>
                  <p className="mt-1 font-bold text-xs text-[#069f7d]">Export & FMCG</p>
                </div>
                <div className="rounded-2xl border border-[#e2ded4] bg-white p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7a70]">SKU Code</span>
                  <p className="mt-1 font-mono font-bold text-xs text-[#101c14]">{product.sku}</p>
                </div>
              </div>
            </div>

            {/* Right: Product Info & Buy Widget */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="eyebrow text-[#069f7d]">{product.category}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs font-semibold text-[#6e7a70] flex items-center gap-1">
                  <MapPin size={13} className="text-[#069f7d]" /> {product.origin}
                </span>
              </div>

              <h1 className="font-serif-custom mt-2 text-[clamp(36px,4.5vw,56px)] font-normal leading-[1.06] tracking-tight text-[#101c14]">
                {product.name}
              </h1>

              {product.tagline && (
                <p className="mt-3 text-[17px] font-medium text-[#446449]">
                  {product.tagline}
                </p>
              )}

              {/* Price Banner */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f0ece1] p-5 border border-[#e2ded4]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e7a70]">
                    Wholesale Price per Kilogram
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-[34px] font-bold tracking-tight text-[#143522]">
                      {naira(product.priceNgn)}
                    </span>
                    <span className="text-sm font-semibold text-[#6e7a70]">/ kg</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-medium text-[#6e7a70]">Batch Minimum</span>
                  <p className="text-sm font-bold text-[#101c14]">{product.minOrderKg} kg minimum</p>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-[#546256]">
                <p>{product.description}</p>
              </div>

              {/* Sourcing Specifications list */}
              <div className="mt-6 rounded-2xl border border-[#e8e5dc] bg-white p-5 space-y-2.5 text-xs text-[#546256]">
                <p className="font-bold uppercase tracking-wider text-[#143522] mb-1">
                  Commercial Sourcing Specs
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#069f7d] shrink-0" />
                  <span>Direct farmgate aggregation with low moisture test report</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#069f7d] shrink-0" />
                  <span>Cleaned, sorted, and packed in heavy-duty woven polypropylene sacks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#069f7d] shrink-0" />
                  <span>Immediate dispatch from Kaduna/Kano aggregation depots</span>
                </div>
              </div>

              {/* Interactive Quantity Estimate & Cart Widget */}
              <QuantityEstimate product={product} />
            </div>
          </div>

          {/* Related Produce Section */}
          {otherProducts.length > 0 && (
            <div className="mt-24 border-t border-[#e8e5dc] pt-14">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="eyebrow text-[#069f7d]">Related Harvests</span>
                  <h2 className="font-serif-custom text-[28px] tracking-tight text-[#101c14] mt-1">
                    Other produce ready for dispatch
                  </h2>
                </div>
                <Link href="/#catalogue" className="text-xs font-bold text-[#069f7d] hover:underline">
                  View all produce →
                </Link>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {otherProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

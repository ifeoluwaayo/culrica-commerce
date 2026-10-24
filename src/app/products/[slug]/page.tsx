import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { publicProduct, allProducts } from "@/lib/store";
import { naira, productImage } from "@/lib/products";
import { QuantityEstimate } from "@/components/quantity-estimate";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) return { title: "Produce not found" };
  return { title: `${product.name} · Wholesale`, description: `${product.tagline} Sourced from ${product.origin}. ${naira(product.priceNgn)} per kilogram.` };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) notFound();
  const otherProducts = (await allProducts()).filter(item => item.id !== product.id).slice(0, 3);
  const available = product.stockKg >= product.minOrderKg;

  return <div className="product-detail"><SiteHeader /><main id="main-content">
    <div className="section-gutter flex items-center justify-between border-b border-[#dcded6] py-5 text-xs text-[#627870]"><Link href="/#catalogue" className="inline-flex items-center gap-3"><ArrowLeft size={14} /> Back to the marketplace</Link><span>{product.category}</span></div>
    <div className="section-gutter product-layout">
      <div><div className="product-gallery"><Image src={productImage(product.imageSrc)} alt={product.name} fill priority sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /><span className="absolute bottom-6 left-6 rounded bg-white/90 px-3 py-2 text-xs text-[#1e3232]">{product.origin}</span></div><dl className="product-specs"><div><dt>Growing region</dt><dd>{product.origin}</dd></div><div><dt>Product reference</dt><dd>{product.sku}</dd></div></dl></div>
      <div className="product-info"><span className="eyebrow">The Culrica collection / {product.category}</span><h1>{product.name}</h1><p className="product-lead">{product.tagline}</p><div className="product-price-row"><div><strong>{naira(product.priceNgn)}</strong><small> / kilogram</small></div><div className={`availability ${available ? "" : "availability--empty"}`}><i />{available ? `${product.stockKg} kg available` : "Currently unavailable"}</div></div><p className="product-detail-description">{product.description.replace(/Sample (?:product )?data for the TSG Labs exercise\.?/g, "").trim()}</p><QuantityEstimate product={product} /><div className="mt-6 flex flex-wrap justify-between gap-3 text-xs text-[#627870]"><span>Whole-kilogram orders</span><span>Minimum {product.minOrderKg} kg</span><span>Paystack checkout</span></div></div>
    </div>
    {otherProducts.length > 0 && <section className="product-related section-gutter"><div><div><span className="eyebrow">Keep discovering</span><h2>More from the harvest.</h2></div><Link className="text-link" href="/#catalogue">Explore the collection <ArrowRight size={14} /></Link></div><div className="product-grid">{otherProducts.map((item, index) => <ProductCard product={item} index={index} key={item.id} />)}</div></section>}
  </main><SiteFooter /></div>;
}

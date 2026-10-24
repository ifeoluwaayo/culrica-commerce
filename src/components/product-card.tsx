"use client";

import Image from "next/image";
import { productImage } from "@/lib/products";
import Link from "next/link";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { naira, type Product, LOW_STOCK_KG } from "@/lib/products";
import { useCart } from "@/context/cart-context";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addItem, items } = useCart();
  const inCart = items.find(item => item.product.id === product.id);
  const unavailable = product.stockKg < product.minOrderKg;
  return <article className="produce-card">
    <Link href={`/products/${product.slug}`} className="produce-image" aria-label={`Explore ${product.name}`}>
      <Image src={productImage(product.imageSrc)} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
      <div className="produce-image-top"><span>{product.category}</span><span className="produce-number">/{String(index + 1).padStart(2, "0")}</span></div>
      <span className="produce-image-arrow"><ArrowUpRight size={24} strokeWidth={1.2} /></span>
      {product.isFeatured && <span className="produce-featured">Selected harvest</span>}
    </Link>
    <div className="produce-meta"><span>{product.origin}</span><span className={`availability ${unavailable ? "availability--empty" : ""}`}><i />{unavailable ? "Unavailable" : product.stockKg <= LOW_STOCK_KG ? `${product.stockKg} kg remaining` : "Available now"}</span></div>
    <Link href={`/products/${product.slug}`} className="produce-title"><h3>{product.name}</h3></Link>
    <p className="produce-description">{product.tagline || product.description}</p>
    <div className="produce-purchase"><div><span className="produce-price">{naira(product.priceNgn)}<small> / kg</small></span><span className="produce-minimum">Minimum order · {product.minOrderKg} kg</span></div><button disabled={unavailable} onClick={() => addItem(product, product.minOrderKg)} aria-label={`Add ${product.name} to bag`} className={inCart ? "in-bag" : ""}>{inCart ? <Check size={16} /> : <Plus size={16} />}<span>{inCart ? `${inCart.quantityKg} kg in bag` : "Add to bag"}</span></button></div>
  </article>;
}

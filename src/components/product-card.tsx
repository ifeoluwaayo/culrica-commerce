"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Plus, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { naira, type Product, LOW_STOCK_KG } from "@/lib/products";
import { useCart } from "@/context/cart-context";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const cartItem = items.find((i) => i.product.id === product.id);

  const isLowStock = product.stockKg > 0 && product.stockKg <= LOW_STOCK_KG;
  const isOutOfStock = product.stockKg === 0;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[#e8e5dc] bg-white transition-all duration-300 hover:border-[#143522]/30 hover:shadow-xl">
      {/* Product Image & Badges */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-[#f0ece1]">
        <Link href={`/products/${product.slug}`} className="block h-full w-full">
          <Image
            src={product.imageSrc}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute left-4 top-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
          <span className="rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#143522] shadow-xs">
            {product.category}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-md ${
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
              ? `${product.stockKg}kg left`
              : `${product.stockKg}kg available`}
          </span>
        </div>

        {product.isFeatured && (
          <div className="absolute bottom-3 left-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#143522] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
              ★ Featured Produce
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#6e7a70]">
          <MapPin size={13} className="text-[#069f7d]" />
          <span>{product.origin}</span>
          <span className="text-gray-300">·</span>
          <span>SKU: {product.sku}</span>
        </div>

        <Link href={`/products/${product.slug}`} className="group-hover:text-[#069f7d] transition">
          <h3 className="font-serif-custom mt-2 text-[20px] font-bold tracking-tight text-[#101c14] line-clamp-1">
            {product.name}
          </h3>
        </Link>

        <p className="mt-1.5 text-[13px] leading-relaxed text-[#6e7a70] line-clamp-2">
          {product.tagline || product.description}
        </p>

        {/* Price & Action Row */}
        <div className="mt-6 flex items-end justify-between border-t border-[#f0ece1] pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6e7a70]">
              Wholesale Rate
            </p>
            <p className="mt-0.5 text-[22px] font-bold tracking-tight text-[#143522]">
              {naira(product.priceNgn)}
              <span className="text-[12px] font-normal text-[#6e7a70]"> / kg</span>
            </p>
            <p className="text-[10px] text-[#8e9c90]">
              Min. batch: {product.minOrderKg} kg
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/products/${product.slug}`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2ded4] text-[#143522] hover:bg-[#f0ece1] transition"
              title="View product details"
              aria-label={`View details for ${product.name}`}
            >
              <ArrowRight size={16} />
            </Link>

            <button
              onClick={() => addItem(product, product.minOrderKg)}
              disabled={isOutOfStock}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition shadow-xs ${
                cartItem
                  ? "bg-[#069f7d] text-white hover:bg-[#04775d]"
                  : "bg-[#143522] text-white hover:bg-[#0d2417]"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={`Add ${product.name} to wholesale cart`}
            >
              {cartItem ? (
                <>
                  <Check size={14} />
                  <span>{cartItem.quantityKg}kg in Cart</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Order {product.minOrderKg}kg</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

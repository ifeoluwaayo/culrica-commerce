"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { naira, type Product } from "@/lib/products";
import { useCart } from "@/context/cart-context";

export function QuantityEstimate({
  product
}: {
  product: Product;
}) {
  const { addItem, openCheckout, items } = useCart();
  const [qty, setQty] = useState(product.minOrderKg);

  const cartItem = items.find((i) => i.product.id === product.id);
  const canOrder = product.stockKg >= product.minOrderKg;

  const handleAddToCart = () => {
    if (!canOrder) return;
    addItem(product, qty);
  };

  const handleInstantCheckout = () => {
    if (!canOrder) return;
    addItem(product, qty);
    openCheckout();
  };

  return (
    <div className="mt-8 rounded-[24px] border border-[#e2ded4] bg-[#fdfdfb] p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-[#eeeae0]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#069f7d]">
            Wholesale Quantity Selector
          </span>
          <p className="text-[12px] text-[#6e7a70] mt-0.5">
            Select exact kilograms for batch dispatch
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#143522] bg-[#eaf4ec] px-3 py-1 rounded-full">
          Min: {product.minOrderKg} kg
        </span>
      </div>

      {/* Stepper and Price Calculation */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canOrder || qty <= product.minOrderKg}
            onClick={() => setQty((v) => Math.max(product.minOrderKg, v - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#dcd7cb] bg-white text-[#101c14] hover:bg-[#f5f2ea] disabled:opacity-30 transition"
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>

          <div className="flex flex-col items-center">
            <span className="min-w-[70px] text-center text-2xl font-bold tracking-tight text-[#101c14]">
              {canOrder ? qty : 0}
            </span>
            <span className="text-[10px] uppercase font-bold text-[#6e7a70]">Kilograms</span>
          </div>

          <button
            type="button"
            disabled={!canOrder || qty >= product.stockKg}
            onClick={() => setQty((v) => Math.min(product.stockKg, v + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#dcd7cb] bg-white text-[#101c14] hover:bg-[#f5f2ea] disabled:opacity-30 transition"
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-medium text-[#6e7a70]">Subtotal ({qty}kg)</p>
          <p className="text-[26px] font-bold tracking-tight text-[#143522]">
            {naira(canOrder ? qty * product.priceNgn : 0)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canOrder}
          className="btn-outline w-full py-3.5 text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {cartItem ? (
            <>
              <Check size={16} className="text-[#069f7d]" />
              <span>In Cart ({cartItem.quantityKg}kg)</span>
            </>
          ) : (
            <>
              <ShoppingBag size={16} />
              <span>Add {qty}kg to Cart</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleInstantCheckout}
          disabled={!canOrder}
          className="btn-accent w-full py-3.5 text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
        >
          <span>Buy Now ({qty}kg)</span>
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[#eeeae0] text-[11px] text-[#6e7a70]">
        <ShieldCheck size={14} className="text-[#069f7d]" />
        <span>Paystack test card enabled · Stock deducted upon verified confirmation</span>
      </div>
    </div>
  );
}

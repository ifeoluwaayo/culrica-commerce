"use client";

import { useState } from "react";
import Image from "next/image";
import { productImage } from "@/lib/products";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Plus, Minus, Tag, ArrowRight, ShoppingBag, ShieldCheck } from "lucide-react";
import { useDialog } from "@/hooks/use-dialog";
import { useCart } from "@/context/cart-context";
import { naira } from "@/lib/products";

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    closeCart,
    openCheckout,
    updateQuantity,
    removeItem,
    coupon,
    couponLoading,
    couponError,
    applyCoupon,
    removeCoupon,
    subtotalNgn,
    discountNgn,
    totalNgn
  } = useCart();

  const dialogRef = useDialog(isCartOpen, closeCart);

  const [couponCode, setCouponCode] = useState("");

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const ok = await applyCoupon(couponCode);
    if (ok) setCouponCode("");
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 bg-[#152525]/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            tabIndex={-1}
            className="cart-panel relative z-10 flex h-full w-full max-w-[480px] flex-col bg-[#fdfdfb] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#deded5] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4ec] text-[#1e3232]">
                  <ShoppingBag size={20} />
                </span>
                <div>
                  <h2 className="text-[18px] font-bold tracking-tight text-[#1e3232]">Your shopping bag</h2>
                  <p className="text-[12px] text-[#6e7a70]">
                    {items.length === 0 ? "Empty cart" : `${items.length} produce item${items.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2ded4] text-[#6e7a70] hover:bg-[#f0ece1] hover:text-[#1e3232] transition"
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0ece1] text-[#6e7a70] mb-4">
                    <ShoppingBag size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-[#1e3232]">Your next idea starts here.</h3>
                  <p className="mt-1 text-sm text-[#6e7a70] max-w-[260px]">
                    Explore our catalogue of premium Nigerian agro produce.
                  </p>
                  <button
                    onClick={closeCart}
                    className="btn-primary mt-6 text-xs"
                  >
                    Explore the marketplace
                  </button>
                </div>
              ) : (
                items.map(({ product, quantityKg }) => (
                  <div
                    key={product.id}
                    className="flex gap-4 rounded-2xl border border-[#deded5] bg-white p-4 transition hover:border-[#cfc9bb]"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f0ece1]">
                      <Image
                        src={productImage(product.imageSrc)}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#069f7d]">
                              {product.category}
                            </span>
                            <h4 className="text-[14px] font-bold text-[#1e3232] line-clamp-1">
                              {product.name}
                            </h4>
                          </div>
                          <button
                            onClick={() => removeItem(product.id)}
                            className="text-[#a5b2a7] hover:text-red-600 transition"
                            title="Remove item"
                            aria-label={`Remove ${product.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="mt-0.5 text-[12px] font-semibold text-[#1e3232]">
                          {naira(product.priceNgn)} <span className="text-[11px] font-normal text-[#6e7a70]">/ kg</span>
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {/* Quantity adjuster */}
                        <div className="flex items-center gap-2 rounded-lg border border-[#e2ded4] bg-[#faf9f5] px-2 py-1">
                          <button
                            onClick={() => updateQuantity(product.id, quantityKg - 1)}
                            disabled={quantityKg <= product.minOrderKg}
                            className="text-[#6e7a70] hover:text-[#1e3232] disabled:opacity-30"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-[40px] text-center text-[12px] font-bold text-[#1e3232]">
                            {quantityKg} kg
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, quantityKg + 1)}
                            disabled={quantityKg >= product.stockKg}
                            className="text-[#6e7a70] hover:text-[#1e3232] disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <span className="text-[14px] font-bold text-[#1e3232]">
                          {naira(product.priceNgn * quantityKg)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with totals and checkout */}
            {items.length > 0 && (
              <div className="border-t border-[#deded5] bg-white px-6 py-5 space-y-4">
                {/* Coupon Code Section */}
                <div>
                  {coupon ? (
                    <div className="flex items-center justify-between rounded-xl bg-[#eaf7f2] border border-[#a8e0d0] px-3.5 py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Tag size={15} className="text-[#069f7d]" />
                        <div>
                          <span className="font-bold text-[#04775d]">{coupon.code}</span>
                          <span className="text-[#069f7d] ml-1.5 font-medium">(-{naira(discountNgn)})</span>
                        </div>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-[#069f7d] hover:text-[#04775d] font-bold text-[11px] underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ba89b]" size={15} />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Coupon code (e.g. HARVEST2026)"
                          className="field pl-9! text-xs uppercase"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={couponLoading || !couponCode.trim()}
                        className="btn-outline px-4! text-xs font-bold disabled:opacity-40"
                      >
                        {couponLoading ? "Checking..." : "Apply"}
                      </button>
                    </form>
                  )}
                  {couponError && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-600">{couponError}</p>
                  )}

                  {!coupon && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-[#6e7a70] font-medium">Promo codes:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCouponCode("CULRICA10");
                          applyCoupon("CULRICA10");
                        }}
                        disabled={couponLoading}
                        className="inline-flex items-center gap-1 rounded-md bg-[#eaf4ec] px-2 py-0.5 font-bold text-[#1e3232] hover:bg-[#d5e8d8] transition"
                        title="Click to apply 10% discount on any order"
                      >
                        <Tag size={10} className="text-[#069f7d]" />
                        <span>CULRICA10</span>
                        <span className="font-normal text-[#6e7a70]">(10% off)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCouponCode("HARVEST2026");
                          applyCoupon("HARVEST2026");
                        }}
                        disabled={couponLoading}
                        className="inline-flex items-center gap-1 rounded-md bg-[#eaf4ec] px-2 py-0.5 font-bold text-[#1e3232] hover:bg-[#d5e8d8] transition"
                        title="Click to apply 15% discount on orders over ₦20,000"
                      >
                        <Tag size={10} className="text-[#069f7d]" />
                        <span>HARVEST2026</span>
                        <span className="font-normal text-[#6e7a70]">(15% &gt;₦20k)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Subtotals & Total */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#6e7a70]">
                    <span>Produce subtotal</span>
                    <span className="font-semibold text-[#1e3232]">{naira(subtotalNgn)}</span>
                  </div>
                  {discountNgn > 0 && (
                    <div className="flex justify-between text-[#069f7d] font-medium">
                      <span>Discount ({coupon?.code})</span>
                      <span>-{naira(discountNgn)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6e7a70]">
                    <span>Dispatch & logistics</span>
                    <span className="font-semibold text-[#069f7d]">Free (Wholesale promo)</span>
                  </div>
                  <div className="flex justify-between border-t border-[#deded5] pt-2 text-[16px] font-bold text-[#1e3232]">
                    <span>Order total</span>
                    <span className="text-[#1e3232]">{naira(totalNgn)}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={openCheckout}
                  className="btn-accent w-full py-3.5! text-sm font-bold shadow-lg"
                >
                  Proceed to Checkout <ArrowRight size={17} />
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-[#6e7a70]">
                  <ShieldCheck size={14} className="text-[#069f7d]" />
                  <span>Verified Paystack checkout & live inventory reserve</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

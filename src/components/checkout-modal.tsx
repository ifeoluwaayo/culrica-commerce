"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Lock, ShieldCheck, CreditCard, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useDialog } from "@/hooks/use-dialog";
import { useCart } from "@/context/cart-context";
import { nigerianStates } from "@/lib/commerce";
import { naira } from "@/lib/products";

export function CheckoutModal() {
  const {
    items,
    isCheckoutOpen,
    closeCheckout,
    openCart,
    coupon,
    subtotalNgn,
    discountNgn,
    totalNgn
  } = useCart();

  const dialogRef = useDialog(isCheckoutOpen, closeCheckout);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "Lagos" as (typeof nigerianStates)[number],
    notes: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        items: items.map((i) => ({ productId: i.product.id, quantityKg: i.quantityKg })),
        customer: form,
        couponCode: coupon?.code
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not initialize checkout");
      }

      // Redirect directly to Paystack payment authorization URL
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error("No payment link received");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCheckout}
            className="fixed inset-0 bg-[#152525]/65 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Delivery and checkout"
            tabIndex={-1}
            className="checkout-panel relative z-10 w-full max-w-[620px] rounded-[24px] bg-[#fefefe] shadow-2xl overflow-hidden border border-[#deded5] my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#deded5] px-7 py-5 bg-[#faf9f5]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    closeCheckout();
                    openCart();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e2ded4] text-[#6e7a70] hover:text-[#1e3232] transition"
                  title="Return to cart"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 className="text-lg font-bold text-[#1e3232]">Delivery & Checkout</h3>
                  <p className="text-[11px] text-[#6e7a70]">Direct wholesale dispatch across Nigeria</p>
                </div>
              </div>
              <button
                onClick={closeCheckout}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e2ded4] text-[#6e7a70] hover:text-[#1e3232] transition"
                aria-label="Close checkout"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error notice */}
            {error && (
              <div className="m-6 mb-0 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700">
                <AlertCircle size={18} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Checkout Form */}
            <form onSubmit={handleSubmit} className="p-7 space-y-6">
              {/* Customer Contact */}
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#1e3232] mb-3">
                  1. Contact Information
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label-form">Business / Customer Name *</label>
                    <input
                      required
                      type="text"
                      className="field"
                      placeholder="e.g. Aliko Agro Blenders Ltd"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-form">Email Address (for order receipt) *</label>
                    <input
                      required
                      type="email"
                      className="field"
                      placeholder="procurement@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-form">Phone Number (delivery updates) *</label>
                    <input
                      required
                      type="tel"
                      className="field"
                      placeholder="+234 803 000 0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#1e3232] mb-3">
                  2. Warehouse / Delivery Destination
                </h4>
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label-form">State *</label>
                      <select
                        required
                        className="field"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value as (typeof nigerianStates)[number] })}
                      >
                        {nigerianStates.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-form">City / Town *</label>
                      <input
                        required
                        type="text"
                        className="field"
                        placeholder="e.g. Ikeja, Kano, Kaduna"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-form">Street Address *</label>
                    <input
                      required
                      type="text"
                      className="field"
                      placeholder="e.g. 14 Commercial Way, Industrial Estate"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-form">Delivery / Dispatch Notes (optional)</label>
                    <input
                      type="text"
                      className="field"
                      placeholder="e.g. Offloading bay 2, call driver on arrival"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Order Breakdown Box */}
              <div className="rounded-2xl border border-[#deded5] bg-[#faf9f5] p-4 text-xs space-y-2">
                <div className="flex justify-between font-medium text-[#6e7a70]">
                  <span>Items total ({items.length} produce types)</span>
                  <span className="font-bold text-[#1e3232]">{naira(subtotalNgn)}</span>
                </div>
                {discountNgn > 0 && (
                  <div className="flex justify-between text-[#069f7d] font-semibold">
                    <span>Discount applied ({coupon?.code})</span>
                    <span>-{naira(discountNgn)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#6e7a70]">
                  <span>Wholesale delivery</span>
                  <span className="text-[#069f7d] font-bold">Complimentary</span>
                </div>
                <div className="border-t border-[#e2ded4] pt-2 flex justify-between items-center text-[15px] font-bold text-[#1e3232]">
                  <span>Amount to pay</span>
                  <span className="text-[#1e3232] text-lg">{naira(totalNgn)}</span>
                </div>
              </div>

              {/* Paystack Test Info Pill */}
              <div className="flex items-start gap-2.5 rounded-xl bg-[#eaf4ec] p-3 text-[11px] text-[#1e3232] border border-[#cbe3cf]">
                <ShieldCheck size={16} className="text-[#069f7d] shrink-0 mt-0.5" />
                <p>
                  <strong>Paystack Test Mode:</strong> You can pay using test debit card{" "}
                  <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">4084 0840 8408 4084</code>{" "}
                  with any future date and 3-digit CVV.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCheckout}
                  disabled={loading}
                  className="btn-outline px-5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="btn-accent px-6 text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Connecting Paystack...</span>
                  ) : (
                    <>
                      <Lock size={15} />
                      <span>Pay {naira(totalNgn)} with Paystack</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

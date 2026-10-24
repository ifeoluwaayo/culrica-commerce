import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, Truck, Package, AlertCircle, ArrowLeft, ShieldCheck, MapPin, CreditCard } from "lucide-react";
import { orderBy } from "@/lib/orders";
import { naira } from "@/lib/products";
import { statusLabel, paymentLabel } from "@/lib/commerce";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrderPaymentButton } from "./payment-button";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const order = await orderBy("reference", reference);
  if (!order) notFound();

  const isPaid = order.paymentStatus === "paid";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f8f4]">
      <SiteHeader />

      <main className="flex-1 py-12 lg:py-20">
        <div className="container-main max-w-[880px]">
          {/* Top back link */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#6e7a70] hover:text-[#101c14] transition"
            >
              <ArrowLeft size={15} /> Back to Storefront
            </Link>

            <span className="font-mono text-xs font-bold text-[#143522] bg-[#f0ece1] px-3 py-1 rounded-full">
              Order #{order.reference}
            </span>
          </div>

          {/* Main Card */}
          <div className="overflow-hidden rounded-[32px] border border-[#e2ded4] bg-white shadow-xl">
            {/* Order Status Banner */}
            <div className="border-b border-[#e8e5dc] bg-[#faf9f5] p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="eyebrow text-[#069f7d]">Order Tracking & Summary</span>
                  <h1 className="font-serif-custom text-[28px] sm:text-[34px] font-bold text-[#101c14] mt-1">
                    Order Status: {statusLabel[order.status]}
                  </h1>
                  <p className="text-xs text-[#6e7a70] mt-1">
                    Placed on {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2">
                  <span
                    className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                      isPaid
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        : order.paymentStatus === "failed"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : "bg-amber-100 text-amber-900 border border-amber-200"
                    }`}
                  >
                    Payment: {paymentLabel[order.paymentStatus]}
                  </span>

                  {order.paymentReference && (
                    <span className="font-mono text-[10px] text-[#6e7a70]">
                      Ref: {order.paymentReference}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Timeline */}
              {!isCancelled && (
                <div className="mt-8 grid grid-cols-4 gap-2 pt-6 border-t border-[#eeeae0] text-center text-xs">
                  {[
                    { step: "pending", label: "Pending", icon: Clock },
                    { step: "confirmed", label: "Confirmed", icon: CheckCircle2 },
                    { step: "shipped", label: "In Transit", icon: Truck },
                    { step: "delivered", label: "Delivered", icon: Package }
                  ].map((s, idx) => {
                    const stepsOrder = ["pending", "confirmed", "shipped", "delivered"];
                    const currentIdx = stepsOrder.indexOf(order.status);
                    const isCompleted = currentIdx >= idx;
                    const isCurrent = order.status === s.step;
                    const Icon = s.icon;

                    return (
                      <div key={s.step} className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full mb-2 transition ${
                            isCompleted
                              ? "bg-[#143522] text-white"
                              : "bg-[#f0ece1] text-[#a5b2a7]"
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <span
                          className={`font-semibold text-[11px] ${
                            isCurrent
                              ? "text-[#143522] font-bold"
                              : isCompleted
                              ? "text-[#143522]"
                              : "text-[#a5b2a7]"
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unpaid Warning & Action */}
            {!isPaid && !isCancelled && (
              <div className="bg-[#fff8f0] border-b border-[#f0dfc8] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-amber-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#101c14]">Payment Pending</h3>
                    <p className="text-xs text-[#6e7a70]">
                      Complete your Paystack test payment to confirm order and guarantee stock.
                    </p>
                  </div>
                </div>
                <OrderPaymentButton reference={order.reference} totalNgn={order.totalNgn} />
              </div>
            )}

            {/* Order Items Table */}
            <div className="p-6 sm:p-8">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#6e7a70] mb-4">
                Ordered Produce Lines
              </h2>

              <div className="divide-y divide-[#eeeae0] rounded-2xl border border-[#e8e5dc] overflow-hidden">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white hover:bg-[#faf9f5]">
                    <div className="flex items-center gap-4">
                      {item.imageSrc && (
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-[#f0ece1] shrink-0 border border-[#e8e5dc]">
                          <Image src={item.imageSrc} alt={item.name} fill className="object-cover" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-[#101c14]">{item.name}</h3>
                        <p className="text-xs text-[#6e7a70]">
                          SKU: {item.sku} · {naira(item.priceNgn)}/kg
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-[#143522]">{item.quantityKg} kg</p>
                      <p className="text-sm font-bold text-[#101c14] mt-0.5">{naira(item.lineTotalNgn)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-full sm:w-[320px] rounded-2xl bg-[#faf9f5] border border-[#e8e5dc] p-5 space-y-2.5 text-xs">
                  <div className="flex justify-between text-[#6e7a70]">
                    <span>Produce Subtotal</span>
                    <span className="font-semibold text-[#101c14]">{naira(order.subtotalNgn)}</span>
                  </div>
                  {order.discountNgn > 0 && (
                    <div className="flex justify-between text-[#069f7d] font-semibold">
                      <span>Coupon Discount ({order.couponCode})</span>
                      <span>-{naira(order.discountNgn)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6e7a70]">
                    <span>Dispatch Freight</span>
                    <span className="font-semibold text-[#069f7d]">
                      {order.deliveryNgn > 0 ? naira(order.deliveryNgn) : "Free"}
                    </span>
                  </div>
                  <div className="border-t border-[#eeeae0] pt-2 flex justify-between items-center text-[16px] font-bold text-[#101c14]">
                    <span>Total Amount</span>
                    <span className="text-[#143522]">{naira(order.totalNgn)}</span>
                  </div>
                </div>
              </div>

              {/* Customer and Delivery info */}
              <div className="mt-8 grid sm:grid-cols-2 gap-6 pt-6 border-t border-[#eeeae0] text-xs">
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-[#6e7a70] mb-2">Customer Details</h3>
                  <div className="space-y-1 text-[#101c14]">
                    <p className="font-bold">{order.customerName}</p>
                    <p>{order.customerEmail}</p>
                    <p>{order.customerPhone}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold uppercase tracking-wider text-[#6e7a70] mb-2">Delivery Address</h3>
                  <div className="space-y-1 text-[#101c14]">
                    <p>{order.shippingAddress}</p>
                    <p>{order.shippingCity}, {order.shippingState}</p>
                    {order.notes && <p className="text-[#6e7a70] italic mt-1">Notes: {order.notes}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

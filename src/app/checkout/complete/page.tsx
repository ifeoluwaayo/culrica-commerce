import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Package, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { confirmPayment } from "@/lib/payments";
import { orderBy } from "@/lib/orders";
import { naira } from "@/lib/products";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export default async function CheckoutCompletePage({
  searchParams
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const paymentRef = params.reference || params.trxref || "";

  let order = null;
  let errorMsg = null;

  if (paymentRef) {
    try {
      order = await confirmPayment(paymentRef);
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Unable to verify payment";
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f1ea]">
      <SiteHeader />

      <main id="main-content" className="order-surface flex-1 py-16 lg:py-24">
        <div className="container-main max-w-[700px]">
          {order ? (
            <div className="rounded-[32px] border border-[#e2ded4] bg-white p-8 sm:p-12 shadow-xl text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eaf7f2] text-[#069f7d] mb-6">
                <CheckCircle2 size={44} />
              </div>

              <span className="eyebrow text-[#069f7d]">Payment Verified · Order Placed</span>
              <h1 className="font-serif-custom text-[32px] sm:text-[40px] font-bold text-[#1e3232] mt-2">
                Good things are on their way.
              </h1>

              <p className="mt-3 text-[15px] text-[#6e7a70] max-w-[480px] mx-auto leading-relaxed">
                We have received your payment of <strong className="text-[#1e3232]">{naira(order.totalNgn)}</strong>. Your order is confirmed and our dispatch depot has reserved your produce.
              </p>

              {/* Order Reference Badge */}
              <div className="mt-8 rounded-2xl bg-[#faf9f5] border border-[#deded5] p-5 text-left space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-[#eeeae0] pb-3">
                  <span className="text-[#6e7a70] font-semibold">Order Reference</span>
                  <span className="font-mono text-sm font-bold text-[#1e3232]">{order.reference}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6e7a70]">Customer</span>
                  <span className="font-bold text-[#1e3232]">{order.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6e7a70]">Delivery Destination</span>
                  <span className="font-medium text-[#1e3232]">{order.shippingCity}, {order.shippingState}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6e7a70]">Payment Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#069f7d]">
                    <CheckCircle2 size={13} /> Paid via Paystack
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-[#eeeae0] pt-3 text-[14px] font-bold">
                  <span className="text-[#1e3232]">Total Paid</span>
                  <span className="text-[#1e3232]">{naira(order.totalNgn)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/orders/${order.reference}`}
                  className="btn-primary w-full sm:w-auto text-xs font-bold"
                >
                  <span>Track Order Details</span>
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/"
                  className="btn-outline w-full sm:w-auto text-xs font-bold"
                >
                  Return to Storefront
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[32px] border border-[#e2ded4] bg-white p-8 sm:p-12 shadow-xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
                <AlertCircle size={32} />
              </div>
              <h2 className="font-serif-custom text-2xl font-bold text-[#1e3232]">
                {errorMsg || "Payment Verification Pending"}
              </h2>
              <p className="mt-2 text-sm text-[#6e7a70] max-w-[420px] mx-auto">
                If you just completed a payment on Paystack, our system will automatically verify it via webhook within moments.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/" className="btn-primary text-xs font-bold">
                  Return to Catalogue
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

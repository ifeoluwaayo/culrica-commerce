"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { naira } from "@/lib/products";

export function OrderPaymentButton({
  reference,
  totalNgn
}: {
  reference: string;
  totalNgn: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${reference}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start payment");
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment initialization failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handlePay}
        disabled={loading}
        className="btn-accent px-5 py-2.5 text-xs font-bold shadow-md flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            <span>Connecting Paystack...</span>
          </>
        ) : (
          <>
            <CreditCard size={15} />
            <span>Pay {naira(totalNgn)} via Paystack</span>
          </>
        )}
      </button>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Leaf, Sparkles, ArrowLeft } from "lucide-react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f9f8f4]">
      {/* Left Column: Visual Storytelling */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-[#143522] text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/login-hands.jpg"
            alt="Hands holding sesame seeds and hibiscus petals"
            fill
            priority
            className="object-cover opacity-60"
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c2014] via-[#143522]/70 to-[#143522]/40" />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white">
              <Leaf size={20} className="text-[#2bc59e]" />
            </span>
            <span className="font-serif-custom text-[26px]">culrica<span className="text-[#2bc59e]">.</span></span>
          </Link>
          <span className="rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-[#2bc59e] border border-white/15">
            Merchant Workspace
          </span>
        </div>

        {/* Bottom Editorial Quote */}
        <div className="relative z-10 max-w-[480px] space-y-4">
          <span className="eyebrow text-[#2bc59e]">Operating System</span>
          <h2 className="font-serif-custom text-3xl font-normal leading-snug">
            Precision control over African agro commodities, inventory reserves & wholesale orders.
          </h2>
          <div className="flex items-center gap-4 text-xs text-white/70 pt-2 border-t border-white/15">
            <span>Real-time stock sync</span>
            <span>·</span>
            <span>Coupon engine</span>
            <span>·</span>
            <span>Paystack verification</span>
          </div>
        </div>
      </div>

      {/* Right Column: Login Card */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#6e7a70] hover:text-[#101c14] transition"
          >
            <ArrowLeft size={15} /> Back to Storefront
          </Link>

          <div className="lg:hidden">
            <Link href="/" className="font-serif-custom text-xl font-bold text-[#143522]">
              culrica.
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[420px] py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf4ec] text-[#143522] mb-6 shadow-2xs">
            <LockKeyhole size={22} className="text-[#069f7d]" />
          </div>

          <h1 className="font-serif-custom text-[32px] sm:text-[38px] font-bold tracking-tight text-[#101c14]">
            Merchant Sign In
          </h1>
          <p className="mt-2 text-[14px] text-[#6e7a70]">
            Enter your merchant password to manage catalogue, adjust inventory, confirm orders, and configure discounts.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="label-form">Admin Password</label>
              <div className="relative">
                <input
                  autoFocus
                  required
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your admin password"
                  className="field pr-12 text-sm"
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e9c90] hover:text-[#101c14] transition"
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="btn-accent w-full py-3.5 text-sm font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Access Admin Workspace</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Development Hint Box */}
          <div className="mt-8 rounded-2xl bg-[#f0ece1] border border-[#e2ded4] p-4 text-xs text-[#546256] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#143522]">
              <ShieldCheck size={16} className="text-[#069f7d]" />
              <span>Development Demo Access</span>
            </div>
            <p className="text-[12px] leading-relaxed">
              Default local password:{" "}
              <button
                type="button"
                onClick={() => setPassword("culrica-demo-2026")}
                className="font-mono bg-white px-2 py-0.5 rounded border border-[#dcd7cb] font-bold text-[#143522] hover:bg-[#eaf4ec] transition inline-flex items-center gap-1 cursor-pointer"
                title="Click to fill demo password"
              >
                culrica-demo-2026
              </button>
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-[#8e9c90]">
          © 2026 Culrica Commerce · TSG Labs Partner Demonstration
        </div>
      </div>
    </div>
  );
}

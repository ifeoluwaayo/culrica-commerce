"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "./brand";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, ArrowLeft } from "lucide-react";

export function AdminLogin({ showDemoAccess = false }: { showDemoAccess?: boolean }) {
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
    <div className="merchant-login min-h-screen grid lg:grid-cols-2 bg-[#f3f1ea]">
      {/* Left Column: Visual Storytelling */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-[#1e3232] text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/login-hands.jpg"
            alt="Hands holding sesame seeds and hibiscus petals"
            fill
            priority
            className="object-cover opacity-60"
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#152525] via-[#1e3232]/70 to-[#1e3232]/40" />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Brand />
          <span className="rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-[#a0d8c3] border border-white/15">
            Merchant Workspace
          </span>
        </div>

        {/* Bottom Editorial Quote */}
        <div className="relative z-10 max-w-[480px] space-y-4">
          <span className="eyebrow text-[#a0d8c3]">Your commerce workspace</span>
          <h2 className="font-serif-custom text-3xl font-normal leading-snug">
            Good business starts with <em className="font-serif not-italic">a better connection.</em>
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
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#6e7a70] hover:text-[#1e3232] transition"
          >
            <ArrowLeft size={15} /> Back to Storefront
          </Link>

          <div className="lg:hidden">
            <Brand />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[420px] py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf4ec] text-[#1e3232] mb-6 shadow-2xs">
            <LockKeyhole size={22} className="text-[#069f7d]" />
          </div>

          <h1 className="font-serif-custom text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1e3232]">
            Welcome back.
          </h1>
          <p className="mt-2 text-[14px] text-[#6e7a70]">
            Your products, orders and next opportunities are waiting. Sign in to your merchant workspace.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="workspace-password" className="label-form">Workspace password</label>
              <div className="relative">
                <input
                  id="workspace-password"
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e9c90] hover:text-[#1e3232] transition"
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
                  <span>Enter your workspace</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Only show the default credential when the server uses it. */}
          {showDemoAccess && <div className="mt-8 rounded-2xl bg-[#f0ece1] border border-[#e2ded4] p-4 text-xs text-[#546256] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#1e3232]">
              <ShieldCheck size={16} className="text-[#069f7d]" />
              <span>Development Demo Access</span>
            </div>
            <p className="text-[12px] leading-relaxed">
              Default local password:{" "}
              <button
                type="button"
                onClick={() => setPassword("culrica-demo-2026")}
                className="font-mono bg-white px-2 py-0.5 rounded border border-[#dcd7cb] font-bold text-[#1e3232] hover:bg-[#eaf4ec] transition inline-flex items-center gap-1 cursor-pointer"
                title="Click to fill demo password"
              >
                culrica-demo-2026
              </button>
            </p>
          </div>}
        </div>

        <div className="text-center text-xs text-[#8e9c90]">
          © 2026 Culrica · Your business, connected.
        </div>
      </div>
    </div>
  );
}

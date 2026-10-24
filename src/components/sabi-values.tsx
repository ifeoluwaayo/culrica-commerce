"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ShieldCheck, Sprout, TrendingUp, Truck, Zap } from "lucide-react";

const pillars = [
  {
    number: "01",
    code: "TRACE",
    title: "Direct Sourcing & Origin Provenance",
    description:
      "TRACE establishes direct origin pipelines connecting smallholder farmer clusters in Kano, Kaduna, and Nasarawa directly to FMCG manufacturers and tea/beverage blenders.",
    points: ["GPS-mapped farming clusters", "Moisture & cleanliness lab testing", "Zero middleman markup"],
    tone: "bg-[#143522] text-white",
    accent: "text-[#2bc59e]",
    border: "border-[#1e4830]"
  },
  {
    number: "02",
    code: "CULRICA MARKET",
    title: "Wholesale Produce & Live Inventory",
    description:
      "A predictable B2B marketplace powering procurement for industrial processors. Transparent per-kilogram prices, live inventory availability, and guaranteed reserve on checkout.",
    points: ["Real-time whole-kg inventory", "Automated coupon discounts", "Instant Paystack test checkout"],
    tone: "bg-[#069f7d] text-white",
    accent: "text-white",
    border: "border-[#08b891]"
  },
  {
    number: "03",
    code: "TRADE LOGISTICS",
    title: "Aggregation Hubs & Warehousing",
    description:
      "Palletized jute sacks, climate-controlled warehousing in key agro corridors, and reliable freight forwarding to Lagos industrial belts and export terminals.",
    points: ["Clean dry storage facilities", "Interstate freight dispatch", "API connectivity for Chord agents"],
    tone: "bg-[#f0ece1] text-[#101c14]",
    accent: "text-[#143522]",
    border: "border-[#e0dad0]"
  }
];

export function SabiValues() {
  return (
    <section id="values" className="py-20 bg-[#f4f1ea] border-y border-[#e8e5dc]">
      <div className="container-main">
        {/* Section Title */}
        <div className="max-w-[800px] mb-14">
          <span className="eyebrow text-[#069f7d]">Digital Infrastructure For African Produce</span>
          <h2 className="font-serif-custom text-[clamp(34px,4vw,56px)] leading-[1.08] tracking-tight text-[#101c14] mt-2">
            Infrastructure designed for the realities of <em className="font-normal italic text-[#069f7d]">African agro supply.</em>
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#546256]">
            Like Sabi’s market-powering platform, Culrica replaces opaque broker networks with transparent digital trade, guaranteed stock reserves, and verified settlement.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {pillars.map((p) => (
            <div
              key={p.code}
              className={`flex flex-col justify-between rounded-[28px] p-8 transition-transform hover:-translate-y-1 shadow-md border ${p.tone} ${p.border}`}
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-white/15">
                  <span className={`text-[12px] font-bold uppercase tracking-widest ${p.accent}`}>
                    {p.code}
                  </span>
                  <span className="font-mono text-[14px] font-semibold opacity-70">
                    {p.number}
                  </span>
                </div>

                <h3 className="font-serif-custom text-[24px] font-bold leading-tight mt-6">
                  {p.title}
                </h3>

                <p className="mt-3 text-[14px] leading-relaxed opacity-85">
                  {p.description}
                </p>

                <ul className="mt-6 space-y-2 text-[13px] opacity-90">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2">
                      <CheckCircle2 size={15} className={p.accent} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-white/15 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                  Integrated Solution
                </span>
                <Link
                  href="#catalogue"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-inherit"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Aerial Parallax Feature Banner */}
        <div className="relative mt-16 overflow-hidden rounded-[32px] bg-[#143522] text-white shadow-xl">
          <div className="relative aspect-21/9 min-h-[360px] w-full">
            <Image
              src="/images/aerial-farms.jpg"
              alt="Aerial drone photography of geometric farmland plots in Nigeria"
              fill
              className="object-cover opacity-60"
              sizes="(max-width: 1200px) 100vw, 1360px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c2216] via-[#102c1d]/80 to-transparent" />

            <div className="absolute inset-0 flex items-center p-8 sm:p-14 max-w-[650px]">
              <div className="space-y-4">
                <span className="eyebrow text-[#2bc59e]">Phase 2 Ready</span>
                <h3 className="font-serif-custom text-[28px] sm:text-[40px] font-normal leading-tight text-white">
                  Built for our <em className="italic text-[#2bc59e]">Chord AI Teammate</em> on WhatsApp.
                </h3>
                <p className="text-[14px] sm:text-[15px] leading-relaxed text-white/85">
                  The entire catalogue is served through <code className="bg-white/20 px-1.5 py-0.5 rounded text-white font-mono text-xs">GET /api/products</code>. In Phase 2, a Chord-hosted WhatsApp agent can quote, reserve, and verify orders without human intervention.
                </p>
                <div className="pt-2">
                  <Link
                    href="/api/products"
                    target="_blank"
                    className="btn-accent text-xs font-bold"
                  >
                    <span>Test GET /api/products JSON</span>
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

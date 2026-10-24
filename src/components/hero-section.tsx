"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ShieldCheck, Sprout, ArrowUpRight, Sparkles, CheckCircle2 } from "lucide-react";

const slides = [
  {
    id: "sustainable-supply",
    tagline: "Sustainable Agro Supply Chains",
    title: (
      <>
        Connecting African Agro Produce from <em className="font-normal italic text-[#2bc59e]">Farm to Global</em> Commerce.
      </>
    ),
    description:
      "We bridge Northern Nigerian smallholder harvests with industrial food processors, beverage manufacturers, and global export buyers through transparent, digital infrastructure.",
    image: "/images/hero-farm.jpg",
    alt: "Nigerian agricultural farmland during golden hour",
    ctaText: "Explore Wholesale Produce",
    ctaLink: "#catalogue",
    badge: "100% Traceable Harvests"
  },
  {
    id: "empowerment-commerce",
    tagline: "Empowerment Through Commerce",
    title: (
      <>
        Predictable Sourcing for <em className="font-normal italic text-[#2bc59e]">Growing Food</em> Brands.
      </>
    ),
    description:
      "Real-time whole-kilogram inventory, verified moisture grades, and instant bulk ordering for dried hibiscus, ginger, sesame seeds, and botanicals.",
    image: "/images/hero-market.jpg",
    alt: "West African traders sorting dried hibiscus and ginger",
    ctaText: "View Live Inventory",
    ctaLink: "#catalogue",
    badge: "Verified Sourcing Partners"
  },
  {
    id: "traceability-logistics",
    tagline: "Grade-A Quality Assurance",
    title: (
      <>
        Ethical Sourcing for <em className="font-normal italic text-[#2bc59e]">Export & Industrial</em> Standards.
      </>
    ),
    description:
      "From Kaduna ginger to Nasarawa sesame: every batch is cleaned, sorted, weighed, and dispatched with verified laboratory certificates.",
    image: "/images/hero-warehouse.jpg",
    alt: "Modern agricultural warehousing and palletized produce",
    ctaText: "Check Catalogue & Prices",
    ctaLink: "#catalogue",
    badge: "Export & Food Grade"
  }
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <section className="relative overflow-hidden pt-4 pb-10 sm:pt-6">
      <div className="container-main">
        {/* Main Hero Card Container */}
        <div className="relative min-h-[580px] lg:min-h-[640px] rounded-[32px] overflow-hidden bg-[#143522] text-white shadow-2xl flex flex-col justify-between">
          {/* Background Images with AnimatePresence */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full w-full"
              >
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1200px) 100vw, 1360px"
                />
                {/* Editorial Gradients (Sabi style) */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c2216] via-[#102c1d]/65 to-[#102c1d]/30" />
                <div className="absolute inset-0 bg-radial from-transparent via-[#0c2216]/40 to-[#0c2216]/90" />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Top Pill Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 backdrop-blur-md px-4 py-2 text-xs font-semibold text-white/90">
              <Sprout size={15} className="text-[#2bc59e]" />
              <span>{slide.badge}</span>
            </div>

            <div className="hidden sm:flex items-center gap-3 rounded-full border border-white/15 bg-black/25 backdrop-blur-md px-4 py-1.5 text-xs text-white/80">
              <span className="h-2 w-2 rounded-full bg-[#2bc59e] animate-pulse" />
              <span>Live Northern Nigeria Hubs: Kano · Kaduna · Nasarawa</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 p-6 sm:p-10 lg:p-14 max-w-[820px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2bc59e]">
                  {slide.tagline}
                </p>

                <h1 className="font-serif-custom text-[clamp(36px,5.2vw,70px)] font-normal leading-[1.05] tracking-tight text-white drop-shadow-sm">
                  {slide.title}
                </h1>

                <p className="max-w-[620px] text-[15px] sm:text-[17px] leading-relaxed text-white/85">
                  {slide.description}
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={slide.ctaLink}
                    className="btn-accent px-6 py-3.5 text-sm font-bold shadow-lg"
                  >
                    <span>{slide.ctaText}</span>
                    <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-md px-5 py-3.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                  >
                    <span>Merchant Inventory Hub</span>
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Navigation Indicators (Inspired by Sabi's bottom carousel controls) */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/15 bg-black/35 backdrop-blur-md px-6 py-4 sm:px-10">
            <div className="flex items-center gap-2">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrent(idx)}
                  className="group flex items-center gap-2 py-2"
                  aria-label={`Go to slide ${idx + 1}: ${s.tagline}`}
                >
                  <span
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      current === idx ? "w-10 bg-[#2bc59e]" : "w-4 bg-white/30 group-hover:bg-white/60"
                    }`}
                  />
                  <span
                    className={`hidden md:inline text-[11px] font-semibold transition ${
                      current === idx ? "text-white" : "text-white/40 group-hover:text-white/70"
                    }`}
                  >
                    0{idx + 1}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-white/75">
              <span>Whole kg lots</span>
              <span className="text-white/30">/</span>
              <span>Transparent ₦ per kg</span>
              <span className="text-white/30">/</span>
              <span className="text-[#2bc59e]">Paystack verified</span>
            </div>
          </div>
        </div>

        {/* Sabi-style Statement Ticker underneath */}
        <div className="mt-8 rounded-2xl border border-[#e8e5dc] bg-white px-7 py-6 shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-[720px]">
              <span className="eyebrow text-[#069f7d]">Culrica Commerce Manifesto</span>
              <h2 className="font-serif-custom text-[24px] sm:text-[30px] tracking-tight text-[#101c14] mt-1 leading-snug">
                We connect Nigerian agricultural producers with each other and to the world.
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 shrink-0 text-left border-t lg:border-t-0 lg:border-l border-[#e8e5dc] pt-4 lg:pt-0 lg:pl-8">
              <div>
                <p className="text-[26px] font-bold tracking-tight text-[#143522]">100%</p>
                <p className="text-[11px] text-[#6e7a70] font-medium">Traceable origin</p>
              </div>
              <div>
                <p className="text-[26px] font-bold tracking-tight text-[#143522]">₦/kg</p>
                <p className="text-[11px] text-[#6e7a70] font-medium">Clear wholesale price</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[26px] font-bold tracking-tight text-[#069f7d]">Zero</p>
                <p className="text-[11px] text-[#6e7a70] font-medium">Broker inflation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

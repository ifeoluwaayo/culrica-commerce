"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf, ShoppingBag, ArrowUpRight, Menu, X, Shield, Sparkles } from "lucide-react";
import { useCart } from "@/context/cart-context";

export function SiteHeader() {
  const { itemCount, openCart } = useCart();
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#e8e5dc]/80 bg-[#f9f8f4]/85 backdrop-blur-md transition-all">
        <div className="container-main flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-[-0.05em] text-[#101c14] group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#143522] text-[#f9f8f4] transition-transform group-hover:scale-105 shadow-xs">
              <Leaf size={20} className="text-[#069f7d]" />
            </span>
            <span className="font-serif-custom text-[26px] tracking-tight">culrica<span className="text-[#069f7d]">.</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-[#546256]">
            <Link href="#catalogue" className="hover:text-[#101c14] transition">
              Produce Catalogue
            </Link>
            <Link href="#values" className="hover:text-[#101c14] transition">
              Infrastructure & Sourcing
            </Link>
            <Link href="#impact" className="hover:text-[#101c14] transition">
              Traceability
            </Link>
            <Link href="/api/products" target="_blank" className="inline-flex items-center gap-1 hover:text-[#101c14] transition">
              Chord API <ArrowUpRight size={13} className="text-[#8e9c90]" />
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Admin link */}
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#e2ded4] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#143522] hover:border-[#143522] transition shadow-2xs"
            >
              <Shield size={14} className="text-[#069f7d]" />
              <span>Merchant Admin</span>
            </Link>

            {/* Cart trigger button */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-2.5 rounded-full bg-[#143522] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#0d2417] transition shadow-sm"
              aria-label={`Open shopping cart with ${itemCount} kg`}
            >
              <ShoppingBag size={17} className="text-[#2bc59e]" />
              <span className="hidden sm:inline">Wholesale Cart</span>
              {itemCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#069f7d] px-1.5 text-[11px] font-extrabold text-white">
                  {itemCount}kg
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileNav(!mobileNav)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2ded4] bg-white text-[#101c14] lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileNav ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileNav && (
          <div className="border-b border-[#e8e5dc] bg-[#f9f8f4] px-6 py-6 lg:hidden animate-in slide-in-from-top duration-200">
            <div className="flex flex-col space-y-4 text-sm font-semibold text-[#101c14]">
              <Link
                href="#catalogue"
                onClick={() => setMobileNav(false)}
                className="py-1 hover:text-[#069f7d]"
              >
                Produce Catalogue
              </Link>
              <Link
                href="#values"
                onClick={() => setMobileNav(false)}
                className="py-1 hover:text-[#069f7d]"
              >
                Infrastructure & Sourcing
              </Link>
              <Link
                href="#impact"
                onClick={() => setMobileNav(false)}
                className="py-1 hover:text-[#069f7d]"
              >
                Traceability
              </Link>
              <Link
                href="/admin"
                onClick={() => setMobileNav(false)}
                className="py-1 text-[#069f7d]"
              >
                Merchant Admin Workspace
              </Link>
              <Link
                href="/api/products"
                target="_blank"
                className="py-1 flex items-center gap-1 text-[#546256]"
              >
                Chord API JSON <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

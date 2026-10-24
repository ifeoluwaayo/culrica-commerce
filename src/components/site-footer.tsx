import Link from "next/link";
import { Leaf, ArrowUpRight, ShieldCheck, MapPin, Mail, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#1d3d29] bg-[#0c2014] text-white">
      <div className="container-main py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-bold tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d442c] text-white">
                <Leaf size={20} className="text-[#2bc59e]" />
              </span>
              <span className="font-serif-custom text-[26px]">culrica<span className="text-[#2bc59e]">.</span></span>
            </Link>

            <p className="text-[14px] leading-relaxed text-white/70 max-w-[380px]">
              Africa’s emerging B2B digital infrastructure for agricultural commodities. Connecting northern smallholder farmer clusters to commercial buyers with transparent per-kilogram pricing and traceable provenance.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#2bc59e]">
                <ShieldCheck size={14} />
                Paystack Test Mode Active
              </span>
              <span className="text-white/40 text-xs">·</span>
              <span className="text-white/60 text-xs">TSG Labs / Chord</span>
            </div>
          </div>

          {/* Column 1: Produce */}
          <div className="space-y-4 text-xs">
            <p className="font-bold uppercase tracking-wider text-[#2bc59e]">Agro Produce</p>
            <ul className="space-y-2.5 text-white/75">
              <li>
                <Link href="#catalogue" className="hover:text-white transition">
                  Dried Hibiscus Flower (Zobo)
                </Link>
              </li>
              <li>
                <Link href="#catalogue" className="hover:text-white transition">
                  Clean Dried Ginger
                </Link>
              </li>
              <li>
                <Link href="#catalogue" className="hover:text-white transition">
                  White Hulled Sesame Seeds
                </Link>
              </li>
              <li>
                <Link href="#catalogue" className="hover:text-white transition">
                  Flowers & Botanicals
                </Link>
              </li>
              <li>
                <Link href="#catalogue" className="hover:text-white transition">
                  Roots & Spices
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform */}
          <div className="space-y-4 text-xs">
            <p className="font-bold uppercase tracking-wider text-[#2bc59e]">Infrastructure</p>
            <ul className="space-y-2.5 text-white/75">
              <li>
                <Link href="#values" className="hover:text-white transition">
                  TRACE Provenance
                </Link>
              </li>
              <li>
                <Link href="#values" className="hover:text-white transition">
                  Warehouse & Freight Hubs
                </Link>
              </li>
              <li>
                <Link href="/api/products" target="_blank" className="hover:text-white transition flex items-center gap-1">
                  Chord Commerce API <ArrowUpRight size={12} />
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition">
                  Merchant Workspace
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition">
                  Staff Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Hubs & Contact */}
          <div className="space-y-4 text-xs">
            <p className="font-bold uppercase tracking-wider text-[#2bc59e]">Operational Hubs</p>
            <div className="space-y-3 text-white/75">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-[#2bc59e] shrink-0 mt-0.5" />
                <span>Victoria Island Commercial Hub, Lagos, Nigeria</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-[#2bc59e] shrink-0 mt-0.5" />
                <span>Aggregation Center, Kaduna & Kano Corridors</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-[#2bc59e] shrink-0" />
                <span>procurement@culrica.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="mt-14 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© 2026 Culrica Commerce. Built for TSG Labs & Chord Teammate demonstration.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Wholesale Terms</span>
            <span className="hover:text-white cursor-pointer">Export Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

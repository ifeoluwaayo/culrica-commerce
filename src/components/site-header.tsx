"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ArrowUpRight, Menu, X } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { Brand } from "./brand";

export function SiteHeader() {
  const { items, openCart } = useCart();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const home = pathname === "/";

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 40);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!mobileNav) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileNav(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [mobileNav]);

  return (
    <header className={`site-header ${home ? "site-header--home" : ""} ${scrolled || mobileNav ? "site-header--solid" : ""}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="site-nav">
        <Brand />
        <nav className="desktop-links" aria-label="Main navigation">
          <Link href="/" aria-current={home ? "page" : undefined}>Home</Link>
          <Link href="/#catalogue">Marketplace</Link>
          <Link href="/#about">About us</Link>
          <Link href="/#values">Our approach</Link>
          <Link href="/admin">Merchant portal</Link>
        </nav>
        <div className="nav-actions">
          <button onClick={openCart} className="nav-cart" aria-label={`Open shopping bag, ${items.length} products`}>
            <ShoppingBag size={17} strokeWidth={1.5} /><span>Shopping bag</span><span className="bag-count">{items.length}</span>
          </button>
          <button className="nav-toggle" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? "Close navigation" : "Open navigation"} aria-expanded={mobileNav} aria-controls="mobile-menu">{mobileNav ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileNav && <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile navigation">
        <p className="eyebrow">Discover Culrica</p>
        {[["Home", "/"], ["Marketplace", "/#catalogue"], ["About us", "/#about"], ["Our approach", "/#values"], ["Merchant portal", "/admin"]].map(([label, href], index) => <Link key={label} href={href} onClick={() => setMobileNav(false)}><span><small>0{index + 1}</small>{label}</span><ArrowUpRight size={25} /></Link>)}
        <p className="mobile-menu-note">Connecting local harvests with a world of possibility.</p>
      </nav>}
    </header>
  );
}

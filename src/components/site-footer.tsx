import Link from "next/link";
import { Brand } from "./brand";
import { ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return <footer className="site-footer section-gutter"><div className="footer-grid"><div className="footer-brand"><Brand /><p>Connecting agricultural producers and growing businesses. From local roots to a world of opportunity.</p></div><div><h3>Discover</h3><Link href="/#catalogue">Marketplace</Link><Link href="/#about">About Culrica</Link><Link href="/#values">Our approach</Link></div><div><h3>The marketplace</h3><Link href="/#catalogue">Flowers & botanicals</Link><Link href="/#catalogue">Roots & spices</Link><Link href="/#catalogue">Seeds & grains</Link></div><div><h3>Your workspace</h3><Link href="/admin">Merchant portal <ArrowUpRight size={12} /></Link><Link href="/admin/login">Staff sign in</Link><p>Nigeria.<br />Connected to possibility.</p></div></div><div className="footer-baseline"><span>© {new Date().getFullYear()} Culrica. All rights reserved.</span><span>Local roots. Global ambition.</span><Link href="/#main-content">Back to top ↑</Link></div></footer>;
}

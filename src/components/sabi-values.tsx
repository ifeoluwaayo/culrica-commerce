import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BrandMark } from "./brand";

export function SabiValues() {
  return <>
    <section id="about" className="about-commerce section-gutter">
      <div className="about-label"><span>About Culrica</span><span>Rooted in possibility.</span></div>
      <div className="about-content"><h2>Good commerce connects people, produce and possibility.</h2><Link href="/#catalogue" className="text-link text-link--light"><ArrowRight size={14} /> Discover our marketplace</Link><div className="about-bottom"><p>We bring Nigerian agricultural ingredients within reach of growing businesses. Clear prices, available stock, and a direct path from discovery to your next order.</p><BrandMark /></div></div>
    </section>
    <section className="landscape-story" aria-label="Our agricultural roots"><Image src="/images/aerial-farms.jpg" alt="Geometric plots of farmland stretching across the landscape" fill sizes="100vw" className="object-cover" /><div className="landscape-caption"><span>Grown here.</span><em>Going everywhere.</em></div><span className="landscape-location">01 / Nigeria’s agricultural heartland</span></section>
    <section id="values" className="approach-section"><div className="section-gutter approach-heading"><span className="eyebrow">The way we trade</span><h2>A better connection.<br />At every step of your business.</h2></div>
      <div className="approach-grid section-gutter">{[
        { number: "01", title: "Sourcing &\ndiscovery", description: "Explore ingredients by category and origin. Find the right produce for what you’re making next.", tone: "forest" },
        { number: "02", title: "Clarity &\nconfidence", description: "See the price per kilogram and available stock before you order. No guesswork in your next purchase.", tone: "green" },
        { number: "03", title: "Commerce &\nconnection", description: "Build your basket, check out and follow your order. Everything your business needs to keep moving.", tone: "cream" }
      ].map(item => <Link href="/#catalogue" className={`approach-card approach-card--${item.tone}`} key={item.number}><span className="approach-number">{item.number}</span><div className="approach-card-bottom"><h3>{item.title.split("\n").map((line, i) => <span key={i}>{line}</span>)}</h3><p>{item.description}</p><span className="approach-arrow"><ArrowUpRight size={24} strokeWidth={1.3} /></span></div></Link>)}</div>
    </section>
    <section className="trade-guide section-gutter"><div><span className="eyebrow">From discovery to delivery</span><h2>Less friction.<br /><em>More possibility.</em></h2><Link href="/#catalogue" className="text-link"><ArrowRight size={14} /> Start your order</Link></div><div className="trade-guide-steps">{[["01", "Find your ingredients", "Browse the marketplace. Compare origins, product details and prices per kilogram."], ["02", "Make it your order", "Choose your quantities, review your basket and enter your delivery details."], ["03", "Keep your business moving", "Complete payment through Paystack and use your order reference to follow its progress."]].map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={22} /></article>)}</div></section>
    <section className="contact-tiles"><Link href="/#catalogue"><span>For buyers</span><h2>Your next great ingredient<br />is waiting to be discovered.</h2><div><span>Explore the marketplace</span><ArrowUpRight size={36} strokeWidth={1} /></div></Link><Link href="/admin"><span>For merchants</span><h2>Everything you need<br />to keep trade moving.</h2><div><span>Open your workspace</span><ArrowUpRight size={36} strokeWidth={1} /></div></Link></section>
  </>;
}

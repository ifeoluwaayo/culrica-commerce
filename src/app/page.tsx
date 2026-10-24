import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { allProducts } from "@/lib/store";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSection } from "@/components/hero-section";
import { SabiValues } from "@/components/sabi-values";
import { Catalogue } from "@/components/catalogue";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await allProducts();
  return (
    <div className="storefront">
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <section className="market-statement" id="impact">
          <h2>
            We connect the richness of our land with the ambition of your
            business.
          </h2>
        </section>
        <section className="market-feature">
          <div className="market-feature-copy">
            <div className="feature-meta">
              <span>The Culrica marketplace</span>
              <span>Open for possibility ↗</span>
            </div>
            <h2>
              Extraordinary ingredients.
              <br />
              <em>Everyday access.</em>
            </h2>
            <p>
              Hibiscus. Ginger. Sesame. Discover the essentials behind your next
              great product, sourced from Nigeria’s agricultural regions.
            </p>
            <Link href="#catalogue" className="text-link">
              <ArrowRight size={14} /> Find your produce
            </Link>
          </div>
          <Link href="#catalogue" className="market-feature-image">
            <Image
              src="/images/hero-market.jpg"
              alt="Hibiscus and ginger at an agricultural produce market"
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              className="object-cover"
            />
            <span>
              <span>Good things start at the source.</span>
              <ArrowUpRight size={27} strokeWidth={1.3} />
            </span>
          </Link>
        </section>
        <Catalogue products={products} />
        <SabiValues />
      </main>
      <SiteFooter />
    </div>
  );
}

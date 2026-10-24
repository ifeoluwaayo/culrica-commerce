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
    <div className="flex min-h-screen flex-col bg-[#f9f8f4]">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <Catalogue products={products} />
        <SabiValues />
      </main>
      <SiteFooter />
    </div>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { CheckoutModal } from "@/components/checkout-modal";

export const metadata: Metadata = {
  title: {
    default: "Culrica | African Agro Produce Commerce",
    template: "%s | Culrica",
  },
  description:
    "Empowering African agricultural markets. Sourcing dried hibiscus, ginger, sesame seeds and botanicals with transparent per-kg pricing and verified Paystack checkout.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased">
        <CartProvider>
          {children}
          <CartDrawer />
          <CheckoutModal />
        </CartProvider>
      </body>
    </html>
  );
}

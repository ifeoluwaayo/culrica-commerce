"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Product } from "@/lib/products";

export type CartItem = {
  product: Product;
  quantityKg: number;
};

export type AppliedCoupon = {
  code: string;
  description: string;
  discountNgn: number;
};

type CartContextType = {
  items: CartItem[];
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  coupon: AppliedCoupon | null;
  couponLoading: boolean;
  couponError: string | null;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  addItem: (product: Product, quantityKg?: number) => void;
  updateQuantity: (productId: string, quantityKg: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  itemCount: number;
  subtotalNgn: number;
  discountNgn: number;
  deliveryNgn: number;
  totalNgn: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "culrica_cart_v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse cart storage", e);
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to save cart storage", e);
      }
    }
  }, [items, isHydrated]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const openCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };
  const closeCheckout = () => setIsCheckoutOpen(false);

  const addItem = (product: Product, quantityKg = product.minOrderKg) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stockKg, existing.quantityKg + quantityKg);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantityKg: nextQty } : item
        );
      }
      return [...prev, { product, quantityKg: Math.max(product.minOrderKg, Math.min(product.stockKg, quantityKg)) }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, quantityKg: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const clamped = Math.max(0, Math.min(item.product.stockKg, quantityKg));
          return { ...item, quantityKg: clamped };
        })
        .filter((item) => item.quantityKg > 0)
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(null);
    setCouponError(null);
  };

  const subtotalNgn = items.reduce((sum, item) => sum + item.product.priceNgn * item.quantityKg, 0);
  const deliveryNgn = 0; // Standard free dispatch for demo wholesale
  const discountNgn = coupon ? Math.min(subtotalNgn, coupon.discountNgn) : 0;
  const totalNgn = Math.max(0, subtotalNgn - discountNgn + deliveryNgn);
  const itemCount = items.reduce((sum, item) => sum + item.quantityKg, 0);

  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!code.trim() || items.length === 0) return false;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          items: items.map((i) => ({ productId: i.product.id, quantityKg: i.quantityKg }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Invalid coupon code");
        setCoupon(null);
        return false;
      }
      setCoupon({
        code: data.code,
        description: data.description,
        discountNgn: data.discountNgn
      });
      return true;
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Failed to validate coupon");
      return false;
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponError(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        isCheckoutOpen,
        coupon,
        couponLoading,
        couponError,
        openCart,
        closeCart,
        toggleCart,
        openCheckout,
        closeCheckout,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        itemCount,
        subtotalNgn,
        discountNgn,
        deliveryNgn,
        totalNgn
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}

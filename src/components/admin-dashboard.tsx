"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  CircleAlert,
  CirclePlus,
  Clock,
  Eye,
  EyeOff,
  History,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  User,
  X
} from "lucide-react";
import {
  categories,
  imageForCategory,
  naira,
  type Product,
  type ProductInput,
  LOW_STOCK_KG
} from "@/lib/products";
import {
  type Coupon,
  type CouponInput,
  type InventoryMovement,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  couponState,
  reasonLabel,
  statusLabel,
  paymentLabel
} from "@/lib/commerce";

type Tab = "overview" | "products" | "inventory" | "orders" | "coupons";

type Props = {
  initialProducts: Product[];
  initialCoupons: Coupon[];
  initialOrders: Order[];
  initialMovements: InventoryMovement[];
  storage: string;
};

const blankProduct: ProductInput = {
  sku: "",
  name: "",
  tagline: "",
  description: "",
  category: "Flowers & Botanicals",
  origin: "Northern Nigeria",
  priceNgn: 8500,
  stockKg: 30,
  minOrderKg: 1,
  imageSrc: "",
  isActive: true,
  isFeatured: false
};

const blankCoupon: CouponInput = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: 10,
  minSubtotalNgn: 0,
  maxRedemptions: null,
  startsAt: null,
  endsAt: null,
  isActive: true
};

export function AdminDashboard({
  initialProducts,
  initialCoupons,
  initialOrders,
  initialMovements,
  storage
}: Props) {
  const router = useRouter();

  // Primary data states
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [movements, setMovements] = useState<InventoryMovement[]>(initialMovements);

  // Filter & Search states
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState("All");

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");

  const [couponSearch, setCouponSearch] = useState("");

  // Modals & Forms states
  const [productModal, setProductModal] = useState<Product | null | "new">(null);
  const [productForm, setProductForm] = useState<ProductInput>(blankProduct);

  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);

  const [adjustModalTarget, setAdjustModalTarget] = useState<Product | null>(null);
  const [adjustForm, setAdjustForm] = useState<{ deltaKg: number; reason: "restock" | "adjustment" | "damage"; note: string }>({
    deltaKg: 10,
    reason: "restock",
    note: ""
  });

  const [couponModal, setCouponModal] = useState<Coupon | null | "new">(null);
  const [couponForm, setCouponForm] = useState<CouponInput>(blankCoupon);
  const [deleteCouponTarget, setDeleteCouponTarget] = useState<Coupon | null>(null);

  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // UI state
  const [navOpen, setNavOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Key Overview metrics
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((s, o) => s + o.totalNgn, 0);

    const totalStockUnits = products
      .filter((p) => p.isActive)
      .reduce((s, p) => s + p.stockKg, 0);

    const lowStockItems = products.filter((p) => p.isActive && p.stockKg <= LOW_STOCK_KG);

    const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;
    const activeCouponsCount = coupons.filter((c) => couponState(c) === "active").length;

    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      totalStockUnits,
      totalOrders: orders.length,
      pendingOrdersCount,
      totalRevenue,
      activeCouponsCount
    };
  }, [products, orders, coupons]);

  // Notifications helper
  const showNotice = (msg: string) => {
    setNotice(msg);
    setError("");
    setTimeout(() => setNotice(""), 6000);
  };
  const showError = (msg: string) => {
    setError(msg);
    setNotice("");
  };

  /* ----------------- PRODUCT MUTATIONS ----------------- */

  function openProductEditor(p?: Product) {
    setError("");
    if (p) {
      setProductModal(p);
      setProductForm({
        sku: p.sku,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        category: p.category,
        origin: p.origin,
        priceNgn: p.priceNgn,
        stockKg: p.stockKg,
        minOrderKg: p.minOrderKg,
        imageSrc: p.imageSrc,
        isActive: p.isActive,
        isFeatured: p.isFeatured
      });
    } else {
      setProductModal("new");
      setProductForm(blankProduct);
    }
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const isUpdate = productModal !== null && productModal !== "new";
    const endpoint = isUpdate ? `/api/admin/products/${productModal.id}` : "/api/admin/products";

    try {
      const res = await fetch(endpoint, {
        method: isUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save product");

      const saved = data.product as Product;
      setProducts((prev) =>
        isUpdate ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]
      );
      setProductModal(null);
      showNotice(`${saved.name} was ${isUpdate ? "updated" : "created"} successfully.`);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductActive(p: Product) {
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: p.sku,
          name: p.name,
          tagline: p.tagline,
          description: p.description,
          category: p.category,
          origin: p.origin,
          priceNgn: p.priceNgn,
          stockKg: p.stockKg,
          minOrderKg: p.minOrderKg,
          imageSrc: p.imageSrc,
          isFeatured: p.isFeatured,
          isActive: !p.isActive
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update visibility");
      setProducts((prev) => prev.map((x) => (x.id === p.id ? data.product : x)));
      showNotice(`${p.name} is now ${p.isActive ? "hidden" : "published"}.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function confirmDeleteProduct() {
    if (!deleteProductTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteProductTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete product");
      setProducts((prev) => prev.filter((p) => p.id !== deleteProductTarget.id));
      showNotice(`${deleteProductTarget.name} has been permanently deleted.`);
      setDeleteProductTarget(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  /* ----------------- INVENTORY ADJUSTMENTS ----------------- */

  async function submitStockAdjustment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!adjustModalTarget) return;
    setSaving(true);
    setError("");

    const multiplier = adjustForm.reason === "damage" ? -Math.abs(adjustForm.deltaKg) : adjustForm.deltaKg;

    try {
      const res = await fetch(`/api/admin/inventory/${adjustModalTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deltaKg: multiplier,
          reason: adjustForm.reason,
          note: adjustForm.note
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Stock adjustment failed");

      setProducts((prev) => prev.map((p) => (p.id === adjustModalTarget.id ? data.product : p)));

      // Refresh movements list
      const mvRes = await fetch("/api/admin/inventory");
      if (mvRes.ok) {
        const mvData = await mvRes.json();
        setMovements(mvData.movements || []);
      }

      showNotice(`Stock for ${adjustModalTarget.name} adjusted by ${multiplier > 0 ? `+${multiplier}` : multiplier} kg.`);
      setAdjustModalTarget(null);
      setAdjustForm({ deltaKg: 10, reason: "restock", note: "" });
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setSaving(false);
    }
  }

  /* ----------------- ORDERS MANAGEMENT ----------------- */

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update order status");

      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      if (viewOrder && viewOrder.id === orderId) setViewOrder(data.order);

      // Reload products & movements in case stock was deducted or restored
      const [prodRes, mvRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/inventory")
      ]);
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData.products || []);
      }
      if (mvRes.ok) {
        const mData = await mvRes.json();
        setMovements(mData.movements || []);
      }

      showNotice(`Order #${data.order.reference} moved to ${statusLabel[status]}.`);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function markOrderAsPaid(orderId: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markPaid: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not mark order paid");

      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      if (viewOrder && viewOrder.id === orderId) setViewOrder(data.order);
      showNotice(`Order #${data.order.reference} marked as Paid.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to mark paid");
    } finally {
      setSaving(false);
    }
  }

  /* ----------------- COUPONS MANAGEMENT ----------------- */

  function openCouponEditor(c?: Coupon) {
    setError("");
    if (c) {
      setCouponModal(c);
      setCouponForm({
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minSubtotalNgn: c.minSubtotalNgn,
        maxRedemptions: c.maxRedemptions,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        isActive: c.isActive
      });
    } else {
      setCouponModal("new");
      setCouponForm(blankCoupon);
    }
  }

  async function saveCoupon(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const isUpdate = couponModal !== null && couponModal !== "new";
    const endpoint = isUpdate ? `/api/admin/coupons/${couponModal.id}` : "/api/admin/coupons";

    try {
      const res = await fetch(endpoint, {
        method: isUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(couponForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save coupon");

      const saved = data.coupon as Coupon;
      setCoupons((prev) =>
        isUpdate ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]
      );
      setCouponModal(null);
      showNotice(`Coupon ${saved.code} was ${isUpdate ? "updated" : "created"}.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Coupon save failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteCoupon() {
    if (!deleteCouponTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/coupons/${deleteCouponTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete coupon");

      setCoupons((prev) => prev.filter((c) => c.id !== deleteCouponTarget.id));
      showNotice(`Coupon ${deleteCouponTarget.code} deleted.`);
      setDeleteCouponTarget(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Delete coupon failed");
    } finally {
      setSaving(false);
    }
  }

  /* ----------------- AUTH LOGOUT ----------------- */

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  /* ----------------- FILTERED LISTS ----------------- */

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchText = `${p.name} ${p.sku} ${p.category} ${p.origin}`
        .toLowerCase()
        .includes(productSearch.toLowerCase());
      const matchFilter =
        productFilter === "All" ||
        (productFilter === "Active" && p.isActive) ||
        (productFilter === "Hidden" && !p.isActive) ||
        (productFilter === "Low stock" && p.stockKg <= LOW_STOCK_KG);
      return matchText && matchFilter;
    });
  }, [products, productSearch, productFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchText = `${o.reference} ${o.customerName} ${o.customerEmail} ${o.customerPhone} ${o.shippingCity} ${o.shippingState}`
        .toLowerCase()
        .includes(orderSearch.toLowerCase());
      const matchStatus = orderStatusFilter === "All" || o.status === orderStatusFilter;
      return matchText && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) =>
      `${c.code} ${c.description}`.toLowerCase().includes(couponSearch.toLowerCase())
    );
  }, [coupons, couponSearch]);

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#101c14] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[270px] border-r border-[#e4dfd3] bg-[#0c2014] text-white px-5 py-7 flex flex-col justify-between transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo & Close */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d442c] text-white">
                <Leaf size={20} className="text-[#2bc59e]" />
              </span>
              <span className="font-serif-custom text-[24px]">culrica<span className="text-[#2bc59e]">.</span></span>
            </Link>
            <button onClick={() => setNavOpen(false)} className="lg:hidden text-white/70 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2bc59e]">
            Merchant Workspace
          </div>

          {/* Nav Items */}
          <nav className="mt-8 space-y-1 text-[13px] font-semibold">
            {[
              { id: "overview", label: "Overview & Pulse", icon: LayoutDashboard },
              { id: "products", label: "Produce Catalogue", icon: Package, badge: products.length },
              { id: "inventory", label: "Inventory & Stock", icon: Boxes, badge: stats.lowStockCount ? `${stats.lowStockCount} low` : null },
              { id: "orders", label: "Orders & Dispatch", icon: ShoppingBag, badge: stats.pendingOrdersCount ? `${stats.pendingOrdersCount} new` : null },
              { id: "coupons", label: "Coupons & Discounts", icon: Tag, badge: coupons.length }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as Tab);
                    setNavOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${
                    isActive
                      ? "bg-[#1d442c] text-white font-bold shadow-xs"
                      : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? "text-[#2bc59e]" : "text-white/60"} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        typeof tab.badge === "string" && tab.badge.includes("low")
                          ? "bg-amber-400/20 text-amber-300"
                          : typeof tab.badge === "string" && tab.badge.includes("new")
                          ? "bg-[#2bc59e] text-[#0c2014]"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-4 pt-6 border-t border-white/10">
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-white/70">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <ShieldCheck size={14} className="text-[#2bc59e]" />
                {storage}
              </span>
              <span className="text-[10px] text-white/50">v2.1</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Wholesale mutations sync directly with storefront &amp; Chord API.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-white/75 hover:text-white"
            >
              <span>View Store</span>
              <ArrowUpRight size={13} />
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-300 hover:text-red-200"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex h-20 items-center justify-between border-b border-[#e4dfd3] bg-white/90 backdrop-blur-md px-5 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden text-[#143522]">
              <Menu size={22} />
            </button>
            <div>
              <span className="text-xs font-bold text-[#6e7a70] uppercase tracking-wider">
                Workspace <span className="mx-1.5 text-gray-300">/</span> {activeTab}
              </span>
              <p className="text-sm font-bold text-[#101c14] capitalize">
                {activeTab === "overview" ? "Merchant Overview & Metrics" : activeTab}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#d6e5d8] bg-[#eaf4ec] px-3.5 py-1 text-xs font-bold text-[#143522]">
              <span className="h-2 w-2 rounded-full bg-[#069f7d] animate-pulse" />
              {storage} Storage Mode
            </span>

            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2ded4] bg-white text-[#143522] hover:bg-[#f0ece1] transition"
              title="Visit Storefront"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>

        {/* Global Feedback Banner */}
        {notice && (
          <div className="m-5 lg:mx-10 mb-0 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#069f7d]" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice("")}><X size={14} /></button>
          </div>
        )}
        {error && (
          <div className="m-5 lg:mx-10 mb-0 flex items-center justify-between rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-bold text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")}><X size={14} /></button>
          </div>
        )}

        {/* Content Body */}
        <main className="p-5 lg:p-10 space-y-8 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header greeting */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="eyebrow text-[#069f7d]">Saturday, 24 October 2026 · Live Hub</span>
                  <h1 className="font-serif-custom text-[34px] sm:text-[42px] font-bold tracking-tight text-[#101c14] mt-1">
                    Wholesale Operations Pulse<span className="text-[#069f7d]">.</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-[#6e7a70] mt-1">
                    Live overview of agricultural inventory, customer orders, and promotional coupons.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openProductEditor()}
                    className="btn-primary text-xs font-bold"
                  >
                    <Plus size={15} /> Add Produce
                  </button>
                  <button
                    onClick={() => openCouponEditor()}
                    className="btn-accent text-xs font-bold"
                  >
                    <Tag size={14} /> Create Coupon
                  </button>
                </div>
              </div>

              {/* Low Stock Warning Banner */}
              {stats.lowStockCount > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shrink-0">
                      <CircleAlert size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">
                        {stats.lowStockCount} product{stats.lowStockCount === 1 ? "" : "s"} at or below {LOW_STOCK_KG}kg
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {stats.lowStockItems.map((p) => `${p.name} (${p.stockKg}kg)`).join(", ")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("inventory")}
                    className="btn-outline px-4 py-2 text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
                  >
                    Restock Now →
                  </button>
                </div>
              )}

              {/* Stat Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Wholesale Revenue",
                    value: naira(stats.totalRevenue),
                    sub: "From verified paid orders",
                    icon: TrendingUp,
                    color: "bg-emerald-50 text-emerald-800"
                  },
                  {
                    label: "Available Inventory",
                    value: `${stats.totalStockUnits} kg`,
                    sub: `Across ${stats.activeProducts} published lines`,
                    icon: Boxes,
                    color: "bg-[#eaf4ec] text-[#143522]"
                  },
                  {
                    label: "Total Orders",
                    value: stats.totalOrders,
                    sub: `${stats.pendingOrdersCount} awaiting dispatch`,
                    icon: ShoppingBag,
                    color: "bg-blue-50 text-blue-800"
                  },
                  {
                    label: "Active Coupons",
                    value: stats.activeCouponsCount,
                    sub: `${coupons.length} total codes configured`,
                    icon: Tag,
                    color: "bg-purple-50 text-purple-800"
                  }
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-[#e4dfd3] bg-white p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#6e7a70]">{s.label}</span>
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
                          <Icon size={18} />
                        </span>
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101c14]">{s.value}</p>
                        <p className="text-[11px] text-[#8e9c90] mt-1">{s.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Orders & Stock Activity 2-Col Grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Orders */}
                <div className="rounded-2xl border border-[#e4dfd3] bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#eeeae0]">
                    <div>
                      <h3 className="font-bold text-base text-[#101c14]">Recent Customer Orders</h3>
                      <p className="text-xs text-[#6e7a70]">Latest orders received from storefront or API</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="text-xs font-bold text-[#069f7d] hover:underline"
                    >
                      View all ({orders.length}) →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[#8e9c90]">No orders placed yet.</p>
                  ) : (
                    <div className="divide-y divide-[#eeeae0]">
                      {orders.slice(0, 5).map((o) => (
                        <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#143522]">#{o.reference}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  o.status === "confirmed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : o.status === "pending"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {statusLabel[o.status]}
                              </span>
                            </div>
                            <p className="text-[#6e7a70] mt-0.5">
                              {o.customerName} · {o.shippingState}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm text-[#101c14]">{naira(o.totalNgn)}</span>
                            <p className="text-[10px] text-[#8e9c90]">{o.items.length} produce line{o.items.length === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Stock Movements */}
                <div className="rounded-2xl border border-[#e4dfd3] bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#eeeae0]">
                    <div>
                      <h3 className="font-bold text-base text-[#101c14]">Inventory Movement Log</h3>
                      <p className="text-xs text-[#6e7a70]">Audit trail of stock deductions and restocks</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("inventory")}
                      className="text-xs font-bold text-[#069f7d] hover:underline"
                    >
                      Audit log →
                    </button>
                  </div>

                  {movements.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[#8e9c90]">No movements recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-[#eeeae0]">
                      {movements.slice(0, 5).map((m) => (
                        <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#101c14]">{m.productName}</span>
                              <span className="font-mono text-[10px] text-[#6e7a70]">{m.sku}</span>
                            </div>
                            <p className="text-[11px] text-[#8e9c90] mt-0.5">
                              {reasonLabel[m.reason]} {m.note ? `· ${m.note}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-bold text-xs ${
                                m.deltaKg > 0 ? "text-emerald-700" : "text-amber-800"
                              }`}
                            >
                              {m.deltaKg > 0 ? `+${m.deltaKg}` : m.deltaKg} kg
                            </span>
                            <p className="text-[10px] text-[#8e9c90]">After: {m.stockAfterKg} kg</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS (WITH DELETE SUPPORT!) */}
          {activeTab === "products" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif-custom text-[28px] font-bold text-[#101c14]">
                    Produce Catalogue Management
                  </h2>
                  <p className="text-xs text-[#6e7a70]">
                    Create, edit, toggle visibility, adjust pricing, or permanently delete agro products.
                  </p>
                </div>
                <button
                  onClick={() => openProductEditor()}
                  className="btn-primary text-xs font-bold self-start sm:self-auto"
                >
                  <Plus size={15} /> Add New Produce
                </button>
              </div>

              {/* Filters & Search */}
              <div className="rounded-2xl border border-[#e4dfd3] bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-[300px]">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e9c90]" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by produce name, SKU, origin..."
                    className="field pl-9! text-xs rounded-xl h-10"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-[#6e7a70] font-semibold">Filter:</span>
                  {["All", "Active", "Hidden", "Low stock"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setProductFilter(f)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        productFilter === f
                          ? "bg-[#143522] text-white"
                          : "border border-[#e2ded4] bg-[#faf9f5] text-[#546256] hover:bg-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Table */}
              <div className="rounded-2xl border border-[#e4dfd3] bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#eeeae0] bg-[#faf9f5] text-[#6e7a70] uppercase tracking-wider font-bold text-[10px]">
                        <th className="px-6 py-4">Produce Line</th>
                        <th className="px-4 py-4">SKU / Origin</th>
                        <th className="px-4 py-4">Category</th>
                        <th className="px-4 py-4">Wholesale Price</th>
                        <th className="px-4 py-4">Live Stock</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eeeae0]">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#faf9f5] transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-[#f0ece1] shrink-0 border border-[#e2ded4]">
                                <Image src={p.imageSrc} alt="" fill className="object-cover" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-[#101c14]">{p.name}</p>
                                <p className="text-[11px] text-[#6e7a70] line-clamp-1">{p.tagline}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-mono font-bold text-[#143522]">{p.sku}</span>
                            <p className="text-[11px] text-[#6e7a70]">{p.origin}</p>
                          </td>
                          <td className="px-4 py-4 font-medium text-[#101c14]">{p.category}</td>
                          <td className="px-4 py-4 font-bold text-sm text-[#143522]">
                            {naira(p.priceNgn)} <span className="text-[10px] font-normal text-[#6e7a70]">/kg</span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                                p.stockKg === 0
                                  ? "bg-red-100 text-red-800"
                                  : p.stockKg <= LOW_STOCK_KG
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {p.stockKg} kg
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                                p.isActive ? "text-[#069f7d]" : "text-[#a5b2a7]"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  p.isActive ? "bg-[#069f7d]" : "bg-gray-400"
                                }`}
                              />
                              {p.isActive ? "Published" : "Hidden"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => openProductEditor(p)}
                                title="Edit produce"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2ded4] text-[#143522] hover:bg-[#eaf4ec] transition"
                              >
                                <Pencil size={14} />
                              </button>

                              {/* Visibility Toggle Button */}
                              <button
                                onClick={() => toggleProductActive(p)}
                                title={p.isActive ? "Hide produce from store" : "Publish produce"}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2ded4] text-[#143522] hover:bg-[#eaf4ec] transition"
                              >
                                {p.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>

                              {/* DELETE BUTTON (Requested by user!) */}
                              <button
                                onClick={() => setDeleteProductTarget(p)}
                                title="Permanently delete produce"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-xs text-[#8e9c90]">
                            No produce lines found. Try adjusting your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY & STOCK MOVEMENTS */}
          {activeTab === "inventory" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif-custom text-[28px] font-bold text-[#101c14]">
                    Inventory Levels &amp; Stock Control
                  </h2>
                  <p className="text-xs text-[#6e7a70]">
                    Manage real-time kilograms, log manual restocks, adjustments or crop damage, and audit movements.
                  </p>
                </div>
              </div>

              {/* Product Stock Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-[#e4dfd3] bg-white p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#143522]">{p.sku}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            p.stockKg === 0
                              ? "bg-red-100 text-red-800"
                              : p.stockKg <= LOW_STOCK_KG
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {p.stockKg === 0 ? "Depleted" : p.stockKg <= LOW_STOCK_KG ? "Low Stock" : "In Stock"}
                        </span>
                      </div>
                      <h3 className="font-serif-custom text-lg font-bold text-[#101c14] mt-2 line-clamp-1">{p.name}</h3>
                      <p className="text-xs text-[#6e7a70]">{p.category} · {p.origin}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#eeeae0] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#8e9c90] uppercase font-bold">Current Lot</span>
                        <p className="text-2xl font-bold text-[#143522]">{p.stockKg} kg</p>
                      </div>

                      <button
                        onClick={() => {
                          setAdjustModalTarget(p);
                          setAdjustForm({ deltaKg: 20, reason: "restock", note: "" });
                        }}
                        className="btn-outline px-3.5 py-1.5 text-xs font-bold border-[#143522] text-[#143522] hover:bg-[#eaf4ec]"
                      >
                        Adjust Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full Movement Audit Log */}
              <div className="rounded-2xl border border-[#e4dfd3] bg-white shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#eeeae0] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#101c14]">Stock Movement Audit History</h3>
                    <p className="text-xs text-[#6e7a70]">
                      Every automated order deduction, manual restock, or cancellation restoration is recorded here.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#8e9c90]">
                    {movements.length} log entr{movements.length === 1 ? "y" : "ies"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#eeeae0] bg-[#faf9f5] text-[#6e7a70] uppercase tracking-wider font-bold text-[10px]">
                        <th className="px-6 py-3.5">Timestamp</th>
                        <th className="px-4 py-3.5">Produce / SKU</th>
                        <th className="px-4 py-3.5">Reason</th>
                        <th className="px-4 py-3.5">Change (kg)</th>
                        <th className="px-4 py-3.5">Stock After</th>
                        <th className="px-6 py-3.5">Audit Note / Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eeeae0]">
                      {movements.map((m) => (
                        <tr key={m.id} className="hover:bg-[#faf9f5]">
                          <td className="px-6 py-3 font-mono text-[11px] text-[#6e7a70]">
                            {new Date(m.createdAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-[#101c14]">{m.productName}</span>
                            <span className="ml-2 font-mono text-[11px] text-[#6e7a70]">{m.sku}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-[#f0ece1] px-2 py-0.5 text-[11px] font-semibold text-[#143522]">
                              {reasonLabel[m.reason]}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold">
                            <span className={m.deltaKg > 0 ? "text-emerald-700 font-extrabold" : "text-amber-800 font-extrabold"}>
                              {m.deltaKg > 0 ? `+${m.deltaKg}` : m.deltaKg} kg
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#143522]">{m.stockAfterKg} kg</td>
                          <td className="px-6 py-3 text-[#6e7a70]">
                            {m.note || m.orderId || "—"}
                          </td>
                        </tr>
                      ))}
                      {movements.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-xs text-[#8e9c90]">
                            No inventory movements recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ORDERS & DISPATCH */}
          {activeTab === "orders" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif-custom text-[28px] font-bold text-[#101c14]">
                    Orders &amp; Dispatch Management
                  </h2>
                  <p className="text-xs text-[#6e7a70]">
                    Review wholesale orders, verify customer shipping details, confirm orders to deduct stock, and track dispatch status.
                  </p>
                </div>
              </div>

              {/* Order Search & Filters */}
              <div className="rounded-2xl border border-[#e4dfd3] bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-[320px]">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e9c90]" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by ref, customer name, email, city..."
                    className="field pl-9! text-xs rounded-xl h-10"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <span className="text-xs text-[#6e7a70] font-semibold shrink-0">Status:</span>
                  {["All", "pending", "confirmed", "shipped", "delivered", "cancelled"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition capitalize ${
                        orderStatusFilter === st
                          ? "bg-[#143522] text-white"
                          : "border border-[#e2ded4] bg-[#faf9f5] text-[#546256] hover:bg-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              <div className="rounded-2xl border border-[#e4dfd3] bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#eeeae0] bg-[#faf9f5] text-[#6e7a70] uppercase tracking-wider font-bold text-[10px]">
                        <th className="px-6 py-4">Order Ref</th>
                        <th className="px-4 py-4">Customer</th>
                        <th className="px-4 py-4">Destination</th>
                        <th className="px-4 py-4">Produce Items</th>
                        <th className="px-4 py-4">Total Amount</th>
                        <th className="px-4 py-4">Payment</th>
                        <th className="px-4 py-4">Fulfilment Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eeeae0]">
                      {filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#faf9f5] transition">
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold text-[#143522]">#{o.reference}</span>
                            <p className="text-[10px] text-[#8e9c90] mt-0.5">
                              {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-bold text-[#101c14]">{o.customerName}</p>
                            <p className="text-[11px] text-[#6e7a70]">{o.customerPhone}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#101c14]">{o.shippingCity}</p>
                            <p className="text-[11px] text-[#6e7a70]">{o.shippingState}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-semibold text-[#143522]">
                              {o.items.reduce((s, i) => s + i.quantityKg, 0)} kg
                            </span>
                            <span className="text-[11px] text-[#8e9c90] ml-1">({o.items.length} lines)</span>
                          </td>
                          <td className="px-4 py-4 font-bold text-sm text-[#143522]">
                            {naira(o.totalNgn)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                o.paymentStatus === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : o.paymentStatus === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {paymentLabel[o.paymentStatus]}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                                o.status === "confirmed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : o.status === "shipped"
                                  ? "bg-blue-100 text-blue-800"
                                  : o.status === "delivered"
                                  ? "bg-purple-100 text-purple-800"
                                  : o.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {statusLabel[o.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setViewOrder(o)}
                              className="btn-outline px-3 py-1.5 text-xs font-bold hover:bg-[#eaf4ec]"
                            >
                              Manage Order
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-xs text-[#8e9c90]">
                            No orders match the selected criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COUPONS & DISCOUNTS */}
          {activeTab === "coupons" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif-custom text-[28px] font-bold text-[#101c14]">
                    Coupons &amp; Promotional Discounts
                  </h2>
                  <p className="text-xs text-[#6e7a70]">
                    Configure discount coupon codes (percentage or fixed NGN), usage limits, minimum order totals, and date windows.
                  </p>
                </div>
                <button
                  onClick={() => openCouponEditor()}
                  className="btn-accent text-xs font-bold self-start sm:self-auto"
                >
                  <Plus size={15} /> Create Coupon Code
                </button>
              </div>

              {/* Coupons Search */}
              <div className="rounded-2xl border border-[#e4dfd3] bg-white p-4 shadow-xs flex items-center justify-between">
                <div className="relative w-full sm:w-[320px]">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e9c90]" />
                  <input
                    type="text"
                    value={couponSearch}
                    onChange={(e) => setCouponSearch(e.target.value)}
                    placeholder="Search by code or description..."
                    className="field pl-9! text-xs rounded-xl h-10"
                  />
                </div>
                <span className="text-xs text-[#6e7a70] font-semibold">
                  {filteredCoupons.length} coupon{filteredCoupons.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Coupons Table */}
              <div className="rounded-2xl border border-[#e4dfd3] bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#eeeae0] bg-[#faf9f5] text-[#6e7a70] uppercase tracking-wider font-bold text-[10px]">
                        <th className="px-6 py-4">Coupon Code</th>
                        <th className="px-4 py-4">Discount Value</th>
                        <th className="px-4 py-4">Min. Subtotal</th>
                        <th className="px-4 py-4">Redemptions</th>
                        <th className="px-4 py-4">Validity Window</th>
                        <th className="px-4 py-4">State</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eeeae0]">
                      {filteredCoupons.map((c) => {
                        const state = couponState(c);
                        return (
                          <tr key={c.id} className="hover:bg-[#faf9f5] transition">
                            <td className="px-6 py-4">
                              <span className="font-mono font-bold text-sm text-[#069f7d] bg-[#eaf7f2] px-2.5 py-1 rounded-md border border-[#a8e0d0]">
                                {c.code}
                              </span>
                              {c.description && (
                                <p className="text-[11px] text-[#6e7a70] mt-1">{c.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-4 font-bold text-sm text-[#143522]">
                              {c.discountType === "percent" ? `${c.discountValue}% OFF` : `-${naira(c.discountValue)}`}
                            </td>
                            <td className="px-4 py-4 font-medium text-[#101c14]">
                              {c.minSubtotalNgn > 0 ? naira(c.minSubtotalNgn) : "No minimum"}
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-bold text-[#143522]">{c.redemptions}</span>
                              <span className="text-[#8e9c90] ml-1">
                                / {c.maxRedemptions !== null ? c.maxRedemptions : "Unlimited"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-[11px] text-[#6e7a70]">
                              {c.startsAt || c.endsAt ? (
                                <div className="space-y-0.5">
                                  {c.startsAt && <p>From: {new Date(c.startsAt).toLocaleDateString()}</p>}
                                  {c.endsAt && <p>Until: {new Date(c.endsAt).toLocaleDateString()}</p>}
                                </div>
                              ) : (
                                "Always valid"
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                                  state === "active"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : state === "scheduled"
                                    ? "bg-blue-100 text-blue-800"
                                    : state === "expired"
                                    ? "bg-gray-100 text-gray-800"
                                    : state === "exhausted"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {state}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openCouponEditor(c)}
                                  title="Edit coupon"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2ded4] text-[#143522] hover:bg-[#eaf4ec] transition"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteCouponTarget(c)}
                                  title="Delete coupon"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCoupons.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-xs text-[#8e9c90]">
                            No coupons match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ------------------- MODAL: ADD / EDIT PRODUCT ------------------- */}
      <AnimatePresence>
        {productModal !== null && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setProductModal(null)}
              className="fixed inset-0 bg-[#0d2417]/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative z-10 flex h-full w-full max-w-[580px] flex-col bg-[#fcfbfa] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#e4dfd3] px-7 py-5 bg-white">
                <div>
                  <span className="eyebrow text-[#069f7d]">Catalogue Management</span>
                  <h3 className="font-serif-custom text-2xl font-bold text-[#101c14] mt-0.5">
                    {productModal === "new" ? "Add Produce Line" : "Edit Produce Details"}
                  </h3>
                </div>
                <button
                  onClick={() => setProductModal(null)}
                  disabled={saving}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e2ded4] text-[#6e7a70]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={saveProduct} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-7 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="label-form">Produce Name *</label>
                      <input
                        required
                        className="field"
                        placeholder="e.g. Clean Dried Ginger"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label-form">SKU Code *</label>
                      <input
                        required
                        className="field uppercase font-mono"
                        placeholder="GIN-DRY"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })}
                      />
                    </div>
                    <div>
                      <label className="label-form">Category *</label>
                      <select
                        className="field"
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label-form">Short Tagline</label>
                    <input
                      className="field"
                      placeholder="e.g. A warm staple, ready for your next batch."
                      value={productForm.tagline}
                      onChange={(e) => setProductForm({ ...productForm, tagline: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label-form">Description *</label>
                    <textarea
                      required
                      rows={3}
                      className="field min-h-[85px] resize-y"
                      placeholder="Describe the sorting, cleanliness, moisture level, and target use cases..."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-form">Wholesale Price (₦ / kg) *</label>
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        className="field font-bold"
                        value={productForm.priceNgn}
                        onChange={(e) => setProductForm({ ...productForm, priceNgn: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label-form">Stock Available (kg) *</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        className="field font-bold"
                        value={productForm.stockKg}
                        onChange={(e) => setProductForm({ ...productForm, stockKg: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label-form">Min. Order Batch (kg) *</label>
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        className="field"
                        value={productForm.minOrderKg}
                        onChange={(e) => setProductForm({ ...productForm, minOrderKg: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label-form">Origin Hub / Region *</label>
                      <input
                        required
                        className="field"
                        placeholder="e.g. Kaduna, Nigeria"
                        value={productForm.origin}
                        onChange={(e) => setProductForm({ ...productForm, origin: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Image input with preview */}
                  <div>
                    <label className="label-form">Product Image (URL or Local path)</label>
                    <input
                      className="field text-xs font-mono"
                      placeholder="https://... or leave blank for curated category photo"
                      value={productForm.imageSrc || ""}
                      onChange={(e) => setProductForm({ ...productForm, imageSrc: e.target.value })}
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-[#f0ece1] border border-[#e2ded4] shrink-0">
                        <Image
                          src={productForm.imageSrc?.trim() || imageForCategory(productForm.category)}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-[11px] text-[#6e7a70]">
                        {productForm.imageSrc?.trim() ? "Custom image URL" : "Default category photography will be used"}
                      </span>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="rounded-2xl border border-[#e4dfd3] bg-white p-4 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-[#101c14]">Publish on Storefront &amp; API</p>
                        <p className="text-[11px] text-[#6e7a70]">Hidden produce will not be visible to customers.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={productForm.isActive}
                        onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                        className="h-5 w-5 accent-[#143522]"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-[#eeeae0]">
                      <div>
                        <p className="text-xs font-bold text-[#101c14]">Featured Produce</p>
                        <p className="text-[11px] text-[#6e7a70]">Highlight this produce at the top of the catalogue.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={productForm.isFeatured}
                        onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                        className="h-5 w-5 accent-[#143522]"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-[#e4dfd3] bg-white px-7 py-4">
                  <button
                    type="button"
                    onClick={() => setProductModal(null)}
                    disabled={saving}
                    className="btn-outline px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-5 py-2.5 text-xs font-bold"
                  >
                    {saving ? "Saving..." : productModal === "new" ? "Create Produce" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------- MODAL: DELETE PRODUCT CONFIRMATION ------------------- */}
      <AnimatePresence>
        {deleteProductTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setDeleteProductTarget(null)}
              className="fixed inset-0 bg-[#0d2417]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[460px] rounded-3xl bg-white p-7 shadow-2xl border border-red-200"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="font-serif-custom text-2xl font-bold text-[#101c14]">
                Delete &ldquo;{deleteProductTarget.name}&rdquo;?
              </h3>
              <p className="mt-2 text-xs text-[#6e7a70] leading-relaxed">
                Are you sure you want to <strong>permanently delete</strong> this product? It will be completely removed from the catalogue and public API. Past fulfilled orders will preserve their historical line records.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteProductTarget(null)}
                  disabled={saving}
                  className="btn-outline px-4 py-2 text-xs"
                >
                  Keep Product
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  disabled={saving}
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-xs font-bold transition shadow-sm"
                >
                  {saving ? "Deleting..." : "Yes, Delete Product"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------- MODAL: ADJUST INVENTORY STOCK ------------------- */}
      <AnimatePresence>
        {adjustModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setAdjustModalTarget(null)}
              className="fixed inset-0 bg-[#0d2417]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[480px] rounded-3xl bg-white p-7 shadow-2xl border border-[#e4dfd3]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#eeeae0]">
                <div>
                  <span className="eyebrow text-[#069f7d]">Stock Adjustment</span>
                  <h3 className="font-serif-custom text-xl font-bold text-[#101c14]">
                    {adjustModalTarget.name}
                  </h3>
                </div>
                <button onClick={() => setAdjustModalTarget(null)}>
                  <X size={18} className="text-[#6e7a70]" />
                </button>
              </div>

              <form onSubmit={submitStockAdjustment} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="label-form">Adjustment Reason *</label>
                  <select
                    className="field"
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value as any })}
                  >
                    <option value="restock">Restock (+ kg from harvest)</option>
                    <option value="adjustment">Count Adjustment (+/- kg)</option>
                    <option value="damage">Damage / Moisture Loss (- kg)</option>
                  </select>
                </div>

                <div>
                  <label className="label-form">
                    Amount to {adjustForm.reason === "damage" ? "Deduct" : "Adjust"} (kg) *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="field font-bold text-base"
                    value={adjustForm.deltaKg}
                    onChange={(e) => setAdjustForm({ ...adjustForm, deltaKg: Number(e.target.value) })}
                  />
                  <p className="mt-1 text-[11px] text-[#6e7a70]">
                    Current stock: <strong>{adjustModalTarget.stockKg} kg</strong> → Resulting stock:{" "}
                    <strong>
                      {adjustModalTarget.stockKg + (adjustForm.reason === "damage" ? -Math.abs(adjustForm.deltaKg) : adjustForm.deltaKg)} kg
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="label-form">Audit Log Note</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="e.g. Harvest shipment arrived from Kaduna Depot"
                    value={adjustForm.note}
                    onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#eeeae0]">
                  <button
                    type="button"
                    onClick={() => setAdjustModalTarget(null)}
                    disabled={saving}
                    className="btn-outline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-5 py-2 font-bold"
                  >
                    {saving ? "Updating..." : "Commit Stock Change"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------- MODAL: ADD / EDIT COUPON ------------------- */}
      <AnimatePresence>
        {couponModal !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setCouponModal(null)}
              className="fixed inset-0 bg-[#0d2417]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[500px] rounded-3xl bg-white p-7 shadow-2xl border border-[#e4dfd3]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#eeeae0]">
                <div>
                  <span className="eyebrow text-[#069f7d]">Discount Rules</span>
                  <h3 className="font-serif-custom text-xl font-bold text-[#101c14]">
                    {couponModal === "new" ? "Create Promotional Coupon" : "Edit Coupon"}
                  </h3>
                </div>
                <button onClick={() => setCouponModal(null)}>
                  <X size={18} className="text-[#6e7a70]" />
                </button>
              </div>

              <form onSubmit={saveCoupon} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="label-form">Coupon Code *</label>
                  <input
                    required
                    className="field uppercase font-mono font-bold"
                    placeholder="HARVEST2026"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                  />
                </div>

                <div>
                  <label className="label-form">Description</label>
                  <input
                    className="field"
                    placeholder="e.g. 15% wholesale discount on first order"
                    value={couponForm.description}
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-form">Discount Type *</label>
                    <select
                      className="field"
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed Naira (₦)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-form">
                      Discount Value ({couponForm.discountType === "percent" ? "%" : "₦"}) *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      max={couponForm.discountType === "percent" ? 100 : 10000000}
                      className="field font-bold"
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-form">Min. Order Subtotal (₦)</label>
                    <input
                      type="number"
                      min="0"
                      className="field"
                      value={couponForm.minSubtotalNgn}
                      onChange={(e) => setCouponForm({ ...couponForm, minSubtotalNgn: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="label-form">Max Total Uses (optional)</label>
                    <input
                      type="number"
                      min="1"
                      className="field"
                      placeholder="Unlimited"
                      value={couponForm.maxRedemptions ?? ""}
                      onChange={(e) => setCouponForm({ ...couponForm, maxRedemptions: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e4dfd3] bg-[#faf9f5] p-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-[#101c14]">Coupon Active</span>
                    <input
                      type="checkbox"
                      checked={couponForm.isActive}
                      onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                      className="h-4 w-4 accent-[#143522]"
                    />
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#eeeae0]">
                  <button
                    type="button"
                    onClick={() => setCouponModal(null)}
                    disabled={saving}
                    className="btn-outline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-accent px-5 py-2 font-bold"
                  >
                    {saving ? "Saving..." : couponModal === "new" ? "Create Coupon" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------- MODAL: DELETE COUPON CONFIRMATION ------------------- */}
      <AnimatePresence>
        {deleteCouponTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setDeleteCouponTarget(null)}
              className="fixed inset-0 bg-[#0d2417]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[420px] rounded-3xl bg-white p-7 shadow-2xl border border-red-200"
            >
              <h3 className="font-serif-custom text-xl font-bold text-[#101c14]">
                Delete Coupon &ldquo;{deleteCouponTarget.code}&rdquo;?
              </h3>
              <p className="mt-2 text-xs text-[#6e7a70]">
                This coupon code will be permanently removed and customers will no longer be able to apply it.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteCouponTarget(null)}
                  disabled={saving}
                  className="btn-outline px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteCoupon}
                  disabled={saving}
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-xs font-bold transition"
                >
                  {saving ? "Deleting..." : "Delete Code"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------- DRAWER: MANAGE ORDER DETAILS ------------------- */}
      <AnimatePresence>
        {viewOrder && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewOrder(null)}
              className="fixed inset-0 bg-[#0d2417]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative z-10 flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#e4dfd3] px-7 py-5 bg-[#faf9f5]">
                <div>
                  <span className="eyebrow text-[#069f7d]">Wholesale Order</span>
                  <h3 className="font-mono text-xl font-bold text-[#101c14] mt-0.5">
                    #{viewOrder.reference}
                  </h3>
                </div>
                <button
                  onClick={() => setViewOrder(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e2ded4] text-[#6e7a70]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-7 space-y-6 text-xs">
                {/* Status Badges & Quick Action Controls */}
                <div className="rounded-2xl border border-[#e4dfd3] bg-[#faf9f5] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7a70]">
                        Fulfilment Status
                      </span>
                      <p className="text-base font-bold text-[#143522] capitalize">
                        {statusLabel[viewOrder.status]}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7a70]">
                        Payment Status
                      </span>
                      <p className="text-base font-bold text-[#069f7d] capitalize">
                        {paymentLabel[viewOrder.paymentStatus]}
                      </p>
                    </div>
                  </div>

                  {/* Stock status notice */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#eeeae0] text-[11px] text-[#6e7a70]">
                    <Boxes size={14} className="text-[#069f7d]" />
                    <span>
                      {viewOrder.stockDeducted
                        ? "Stock has been deducted from inventory"
                        : "Stock not yet deducted (will deduct upon confirmation)"}
                    </span>
                  </div>

                  {/* Payment update if unpaid */}
                  {viewOrder.paymentStatus !== "paid" && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => markOrderAsPaid(viewOrder.id)}
                        disabled={saving}
                        className="btn-accent w-full py-2.5 text-xs font-bold"
                      >
                        ✓ Mark Order as Paid (Manual Transfer / Cash)
                      </button>
                    </div>
                  )}

                  {/* Fulfilment status actions */}
                  <div className="pt-3 border-t border-[#eeeae0] space-y-2">
                    <span className="label-form">Update Order Progress:</span>
                    <div className="flex flex-wrap gap-2">
                      {viewOrder.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(viewOrder.id, "confirmed")}
                          disabled={saving}
                          className="btn-primary py-2 px-3 text-xs"
                        >
                          Confirm Order &amp; Deduct Stock
                        </button>
                      )}
                      {viewOrder.status === "confirmed" && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(viewOrder.id, "shipped")}
                          disabled={saving}
                          className="btn-primary py-2 px-3 text-xs bg-blue-700 hover:bg-blue-800"
                        >
                          Mark as In Transit / Shipped
                        </button>
                      )}
                      {viewOrder.status === "shipped" && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(viewOrder.id, "delivered")}
                          disabled={saving}
                          className="btn-primary py-2 px-3 text-xs bg-purple-700 hover:bg-purple-800"
                        >
                          Mark as Delivered
                        </button>
                      )}
                      {viewOrder.status !== "cancelled" && viewOrder.status !== "delivered" && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(viewOrder.id, "cancelled")}
                          disabled={saving}
                          className="rounded-full border border-red-300 text-red-600 hover:bg-red-50 py-2 px-3 text-xs font-bold transition"
                        >
                          Cancel Order (Restore Stock)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Contact & Address */}
                <div className="grid sm:grid-cols-2 gap-4 rounded-2xl border border-[#e4dfd3] bg-white p-5">
                  <div>
                    <h4 className="font-bold text-[#143522] uppercase tracking-wider text-[11px] mb-2">
                      Customer
                    </h4>
                    <p className="font-bold text-sm text-[#101c14]">{viewOrder.customerName}</p>
                    <p className="text-[#6e7a70]">{viewOrder.customerEmail}</p>
                    <p className="text-[#6e7a70]">{viewOrder.customerPhone}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#143522] uppercase tracking-wider text-[11px] mb-2">
                      Delivery Destination
                    </h4>
                    <p className="text-[#101c14] font-medium">{viewOrder.shippingAddress}</p>
                    <p className="text-[#6e7a70]">{viewOrder.shippingCity}, {viewOrder.shippingState}</p>
                    {viewOrder.notes && (
                      <p className="mt-1 text-[11px] italic text-[#6e7a70]">Note: {viewOrder.notes}</p>
                    )}
                  </div>
                </div>

                {/* Produce Lines */}
                <div>
                  <h4 className="font-bold text-[#101c14] uppercase tracking-wider text-[11px] mb-3">
                    Produce Items
                  </h4>
                  <div className="divide-y divide-[#eeeae0] rounded-2xl border border-[#e4dfd3] overflow-hidden">
                    {viewOrder.items.map((line) => (
                      <div key={line.id} className="p-3.5 flex items-center justify-between bg-white">
                        <div>
                          <p className="font-bold text-[#101c14]">{line.name}</p>
                          <p className="text-[11px] text-[#6e7a70]">
                            SKU: {line.sku} · {naira(line.priceNgn)} / kg
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xs text-[#143522]">{line.quantityKg} kg</p>
                          <p className="text-xs font-bold text-[#101c14]">{naira(line.lineTotalNgn)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="rounded-2xl border border-[#e4dfd3] bg-[#faf9f5] p-5 space-y-2">
                  <div className="flex justify-between text-[#6e7a70]">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#101c14]">{naira(viewOrder.subtotalNgn)}</span>
                  </div>
                  {viewOrder.discountNgn > 0 && (
                    <div className="flex justify-between text-[#069f7d] font-semibold">
                      <span>Coupon Discount ({viewOrder.couponCode})</span>
                      <span>-{naira(viewOrder.discountNgn)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6e7a70]">
                    <span>Dispatch Freight</span>
                    <span className="font-bold text-[#101c14]">
                      {viewOrder.deliveryNgn > 0 ? naira(viewOrder.deliveryNgn) : "Free"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#eeeae0] pt-2 font-bold text-[15px] text-[#143522]">
                    <span>Total Amount</span>
                    <span>{naira(viewOrder.totalNgn)}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Close */}
              <div className="p-5 border-t border-[#e4dfd3] bg-white flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewOrder(null)}
                  className="btn-outline px-5 py-2 text-xs font-bold"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { productImage } from "@/lib/products";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Brand } from "./brand";
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
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Headphones,
  History,
  LayoutDashboard,
  Leaf,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
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
  type SupportTicket,
  type TicketCategory,
  type TicketStatus,
  couponState,
  reasonLabel,
  statusLabel,
  paymentLabel,
  ticketCategoryLabels,
  ticketStatusLabels
} from "@/lib/commerce";

type Tab = "overview" | "products" | "inventory" | "orders" | "coupons" | "support";

type Props = {
  initialProducts: Product[];
  initialCoupons: Coupon[];
  initialOrders: Order[];
  initialMovements: InventoryMovement[];
  initialTickets?: SupportTicket[];
  storage: string;
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(iso);
  }
}

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
  initialTickets,
  storage
}: Props) {
  const router = useRouter();

  // Primary data states
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [movements, setMovements] = useState<InventoryMovement[]>(initialMovements);
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets ?? []);

  // Filter & Search states
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState("All");

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");

  const [couponSearch, setCouponSearch] = useState("");

  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("all");
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<string>("all");
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

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

    const openTicketsCount = tickets.filter((t) => t.status === "open").length;
    const inProgressTicketsCount = tickets.filter((t) => t.status === "in_progress").length;
    const resolvedTicketsCount = tickets.filter((t) => t.status === "resolved").length;

    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      totalStockUnits,
      totalOrders: orders.length,
      pendingOrdersCount,
      totalRevenue,
      activeCouponsCount,
      openTicketsCount,
      inProgressTicketsCount,
      resolvedTicketsCount
    };
  }, [products, orders, coupons, tickets]);


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

  /* ----------------- SUPPORT TICKET HELPERS ----------------- */

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const term = ticketSearch.toLowerCase().trim();
      const matchSearch =
        !term ||
        t.ticketReference.toLowerCase().includes(term) ||
        t.customerEmail.toLowerCase().includes(term) ||
        t.issueText.toLowerCase().includes(term) ||
        (t.orderReference && t.orderReference.toLowerCase().includes(term));

      const matchStatus = ticketStatusFilter === "all" || t.status === ticketStatusFilter;
      const matchCategory = ticketCategoryFilter === "all" || t.category === ticketCategoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [tickets, ticketSearch, ticketStatusFilter, ticketCategoryFilter]);

  async function handleTicketStatusChange(ticketId: string, newStatus: TicketStatus) {
    setUpdatingTicketId(ticketId);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update ticket");
      const updated = data.ticket as SupportTicket;
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTicket?.id === updated.id) {
        setSelectedTicket(updated);
      }
      showNotice(`Ticket ${updated.ticketReference} marked as ${ticketStatusLabels[newStatus]}.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update ticket status");
    } finally {
      setUpdatingTicketId(null);
    }
  }

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
    <div className="admin-workspace min-h-screen bg-[#f3f1ea] text-[#1e3232] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside
        className={`workspace-sidebar fixed inset-y-0 left-0 z-40 w-[270px] border-r border-[#deded5] bg-[#152525] text-white px-5 py-7 flex flex-col justify-between transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo & Close */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <Brand />
            <button aria-label="Close workspace navigation" onClick={() => setNavOpen(false)} className="lg:hidden text-white/70 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a0d8c3]">
            Merchant Workspace
          </div>

          {/* Nav Items */}
          <nav className="mt-8 space-y-1 text-[13px] font-semibold">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "products", label: "Products", icon: Package, badge: products.length },
              { id: "inventory", label: "Inventory", icon: Boxes, badge: stats.lowStockCount ? `${stats.lowStockCount} low` : null },
              { id: "orders", label: "Orders", icon: ShoppingBag, badge: stats.pendingOrdersCount ? `${stats.pendingOrdersCount} new` : null },
              { id: "coupons", label: "Discounts", icon: Tag, badge: coupons.length },
              { id: "support", label: "Support", icon: LifeBuoy, badge: stats.openTicketsCount ? `${stats.openTicketsCount} open` : null }
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
                      ? "bg-[#274642] text-white font-bold shadow-xs"
                      : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? "text-[#a0d8c3]" : "text-white/60"} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        typeof tab.badge === "string" && tab.badge.includes("low")
                          ? "bg-amber-400/20 text-amber-300"
                          : typeof tab.badge === "string" && tab.badge.includes("new")
                          ? "bg-[#a0d8c3] text-[#152525]"
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
                <ShieldCheck size={14} className="text-[#a0d8c3]" />
                {storage}
              </span>
              <span className="text-[10px] text-white/50">v2.1</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Your catalogue and storefront stay connected as you work.
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

      {navOpen && <button className="workspace-backdrop lg:hidden" aria-label="Close workspace navigation" onClick={() => setNavOpen(false)} />}
      {/* Main Content Area */}
      <div className="workspace-content min-w-0 flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex h-20 items-center justify-between border-b border-[#deded5] bg-white/90 backdrop-blur-md px-5 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button aria-label="Open workspace navigation" onClick={() => setNavOpen(true)} className="lg:hidden text-[#1e3232]">
              <Menu size={22} />
            </button>
            <div>
              <span className="text-xs font-bold text-[#6e7a70] uppercase tracking-wider">
                Workspace <span className="mx-1.5 text-gray-300">/</span> {activeTab}
              </span>
              <p className="text-sm font-bold text-[#1e3232] capitalize">
                {activeTab === "overview" ? "Merchant Overview & Metrics" : activeTab === "support" ? "Customer Support & Inquiries" : activeTab}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#d6e5d8] bg-[#eaf4ec] px-3.5 py-1 text-xs font-bold text-[#1e3232]">
              <span className="h-2 w-2 rounded-full bg-[#069f7d] animate-pulse" />
              {storage} Storage Mode
            </span>

            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2ded4] bg-white text-[#1e3232] hover:bg-[#f0ece1] transition"
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
        <main className="workspace-main p-5 lg:p-10 space-y-8 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header greeting */}
              <div className="workspace-welcome flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="eyebrow text-[#069f7d]">YOUR BUSINESS, CONNECTED</span>
                  <h1 className="font-serif-custom text-[34px] sm:text-[42px] font-bold tracking-tight text-[#1e3232] mt-1">
                    A clear view of what’s next<span className="text-[#069f7d]">.</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-[#6e7a70] mt-1">
                    Your produce, orders and opportunities. All in one place.
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
              <div className="workspace-stats">
                {[
                  {
                    label: "Total revenue",
                    value: naira(stats.totalRevenue),
                    sub: "From verified paid orders",
                    icon: TrendingUp,
                    color: "bg-emerald-50 text-emerald-800"
                  },
                  {
                    label: "Available stock",
                    value: `${stats.totalStockUnits} kg`,
                    sub: `Across ${stats.activeProducts} published lines`,
                    icon: Boxes,
                    color: "bg-[#eaf4ec] text-[#1e3232]"
                  },
                  {
                    label: "Orders received",
                    value: stats.totalOrders,
                    sub: `${stats.pendingOrdersCount} awaiting dispatch`,
                    icon: ShoppingBag,
                    color: "bg-[#edf3ef] text-[#1e3232]"
                  },
                  {
                    label: "Active discounts",
                    value: stats.activeCouponsCount,
                    sub: `${coupons.length} total codes configured`,
                    icon: Tag,
                    color: "bg-[#edf3ef] text-[#1e3232]"
                  },
                  {
                    label: "Open tickets",
                    value: stats.openTicketsCount,
                    sub: `${tickets.length} total (${stats.resolvedTicketsCount} resolved)`,
                    icon: LifeBuoy,
                    color: stats.openTicketsCount > 0 ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"
                  }
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="workspace-stat"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#6e7a70]">{s.label}</span>
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
                          <Icon size={18} />
                        </span>
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1e3232]">{s.value}</p>
                        <p className="text-[11px] text-[#8e9c90] mt-1">{s.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <section className="workspace-stock-section">
                <div className="workspace-section-title"><div><span className="eyebrow">Your marketplace</span><h2>Ready for the next order.</h2></div><button onClick={() => setActiveTab("inventory")}>Manage inventory <ArrowUpRight size={16} /></button></div>
                {products.length ? <div className="workspace-stock-grid">{products.slice(0, 3).map(product => <button className="workspace-stock-item" key={product.id} onClick={() => openProductEditor(product)}><div className="workspace-stock-image"><Image src={productImage(product.imageSrc)} alt={product.name} fill sizes="100px" className="object-cover" /></div><div><span>{product.category}</span><h3>{product.name}</h3><p><strong>{product.stockKg} kg</strong><span>{product.isActive ? "Published" : "Hidden"}</span></p><div className="stock-level"><span style={{ width: `${Math.max(0, Math.min(100, product.stockKg / Math.max(...products.map(item => item.stockKg), 1) * 100))}%` }} /></div></div><ArrowUpRight size={17} /></button>)}</div> : <p className="workspace-empty">Your marketplace starts here. Add your first product to make it available to buyers.</p>}
              </section>
              {/* Recent Orders & Stock Activity 2-Col Grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Orders */}
                <div className="rounded-2xl border border-[#deded5] bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#eeeae0]">
                    <div>
                      <h3 className="font-bold text-base text-[#1e3232]">Recent orders</h3>
                      <p className="text-xs text-[#6e7a70]">The latest activity from your marketplace</p>
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
                              <span className="font-mono font-bold text-[#1e3232]">#{o.reference}</span>
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
                            <span className="font-bold text-sm text-[#1e3232]">{naira(o.totalNgn)}</span>
                            <p className="text-[10px] text-[#8e9c90]">{o.items.length} produce line{o.items.length === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Stock Movements */}
                <div className="rounded-2xl border border-[#deded5] bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#eeeae0]">
                    <div>
                      <h3 className="font-bold text-base text-[#1e3232]">Stock activity</h3>
                      <p className="text-xs text-[#6e7a70]">Every movement, in one place</p>
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
                              <span className="font-bold text-[#1e3232]">{m.productName}</span>
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
                  <h2 className="font-serif-custom text-[28px] font-bold text-[#1e3232]">
                    Your product collection
                  </h2>
                  <p className="text-xs text-[#6e7a70]">
                    Curate your catalogue, update prices and manage product availability.
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
              <div className="rounded-2xl border border-[#deded5] bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
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
                          ? "bg-[#1e3232] text-white"
                          : "border border-[#e2ded4] bg-[#faf9f5] text-[#546256] hover:bg-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Table */}
              <div className="rounded-2xl border border-[#deded5] bg-white shadow-xs overflow-hidden">
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
                                <Image src={productImage(p.imageSrc)} alt="" fill className="object-cover" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-[#1e3232]">{p.name}</p>
                                <p className="text-[11px] text-[#6e7a70] line-clamp-1">{p.tagline}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-mono font-bold text-[#1e3232]">{p.sku}</span>
                            <p className="text-[11px] text-[#6e7a70]">{p.origin}</p>
                          </td>
                          <td className="px-4 py-4 font-medium text-[#1e3232]">{p.category}</td>
                          <td className="px-4 py-4 font-bold text-sm text-[#1e3232]">
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
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2ded4] text-[#1e3232] hover:bg-[#eaf4ec] transition"
                              >
                                <Pencil size={14} />
                              </button>

                              {/* Visibility Toggle Button */}
                              <button
                                onClick={() => toggleProductActive(p)}
                                title={p.isActive ? "Hide produce from store" : "Publish produce"}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2ded4] text-[#1e3232] hover:bg-[#eaf4ec] transition"
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
                  <h2 className="font-serif-custom text-[28px] font-bold text-[#1e3232]">
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
                    className="rounded-2xl border border-[#deded5] bg-white p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#1e3232]">{p.sku}</span>
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
                      <h3 className="font-serif-custom text-lg font-bold text-[#1e3232] mt-2 line-clamp-1">{p.name}</h3>
                      <p className="text-xs text-[#6e7a70]">{p.category} · {p.origin}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#eeeae0] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#8e9c90] uppercase font-bold">Current Lot</span>
                        <p className="text-2xl font-bold text-[#1e3232]">{p.stockKg} kg</p>
                      </div>

                      <button
                        onClick={() => {
                          setAdjustModalTarget(p);
                          setAdjustForm({ deltaKg: 20, reason: "restock", note: "" });
                        }}
                        className="btn-outline px-3.5 py-1.5 text-xs font-bold border-[#1e3232] text-[#1e3232] hover:bg-[#eaf4ec]"
                      >
                        Adjust Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full Movement Audit Log */}
              <div className="rounded-2xl border border-[#deded5] bg-white shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#eeeae0] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#1e3232]">Stock Movement Audit History</h3>
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
                            <span className="font-bold text-[#1e3232]">{m.productName}</span>
                            <span className="ml-2 font-mono text-[11px] text-[#6e7a70]">{m.sku}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-[#f0ece1] px-2 py-0.5 text-[11px] font-semibold text-[#1e3232]">
                              {reasonLabel[m.reason]}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold">
                            <span className={m.deltaKg > 0 ? "text-emerald-700 font-extrabold" : "text-amber-800 font-extrabold"}>
                              {m.deltaKg > 0 ? `+${m.deltaKg}` : m.deltaKg} kg
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#1e3232]">{m.stockAfterKg} kg</td>
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
                  <h2 className="font-serif-custom text-[28px] font-bold text-[#1e3232]">
                    Orders &amp; Dispatch Management
                  </h2>
                  <p className="text-xs text-[#6e7a70]">
                    Review wholesale orders, verify customer shipping details, confirm orders to deduct stock, and track dispatch status.
                  </p>
                </div>
              </div>

              {/* Order Search & Filters */}
              <div className="rounded-2xl border border-[#deded5] bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
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
                          ? "bg-[#1e3232] text-white"
                          : "border border-[#e2ded4] bg-[#faf9f5] text-[#546256] hover:bg-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              <div className="rounded-2xl border border-[#deded5] bg-white shadow-xs overflow-hidden">
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
                            <span className="font-mono font-bold text-[#1e3232]">#{o.reference}</span>
                            <p className="text-[10px] text-[#8e9c90] mt-0.5">
                              {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-bold text-[#1e3232]">{o.customerName}</p>
                            <p className="text-[11px] text-[#6e7a70]">{o.customerPhone}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#1e3232]">{o.shippingCity}</p>
                            <p className="text-[11px] text-[#6e7a70]">{o.shippingState}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-semibold text-[#1e3232]">
                              {o.items.reduce((s, i) => s + i.quantityKg, 0)} kg
                            </span>
                            <span className="text-[11px] text-[#8e9c90] ml-1">({o.items.length} lines)</span>
                          </td>
                          <td className="px-4 py-4 font-bold text-sm text-[#1e3232]">
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
                  <h2 className="font-serif-custom text-[28px] font-bold text-[#1e3232]">
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
              <div className="rounded-2xl border border-[#deded5] bg-white p-4 shadow-xs flex items-center justify-between">
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
              <div className="rounded-2xl border border-[#deded5] bg-white shadow-xs overflow-hidden">
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
                            <td className="px-4 py-4 font-bold text-sm text-[#1e3232]">
                              {c.discountType === "percent" ? `${c.discountValue}% OFF` : `-${naira(c.discountValue)}`}
                            </td>
                            <td className="px-4 py-4 font-medium text-[#1e3232]">
                              {c.minSubtotalNgn > 0 ? naira(c.minSubtotalNgn) : "No minimum"}
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-bold text-[#1e3232]">{c.redemptions}</span>
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
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2ded4] text-[#1e3232] hover:bg-[#eaf4ec] transition"
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

          {/* ============================================================== */}
          {/* SUPPORT TICKETS TAB                                            */}
          {/* ============================================================== */}
          {activeTab === "support" && (
            <div className="space-y-6">
              {/* Header + Quick Stats */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#069f7d]">
                      <Headphones size={12} />
                      Customer Resolution Desk
                    </span>
                    <span className="text-xs text-[#6e7a70]">
                      Chord MCP &amp; Storefront Inquiries
                    </span>
                  </div>
                  <h2 className="font-serif-custom text-2xl sm:text-3xl font-bold text-[#1e3232] tracking-tight mt-1">
                    Customer Support Tickets
                  </h2>
                  <p className="text-xs text-[#6e7a70] mt-0.5">
                    Monitor disputes, order lookups, and support tickets created through Ada (Chord teammate) or direct customer touchpoints.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-[#deded5] bg-white px-3 py-1.5 text-xs text-[#526054]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Desk: <strong>{stats.openTicketsCount}</strong> open inquiry{stats.openTicketsCount === 1 ? "" : "ies"}</span>
                  </div>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="rounded-2xl border border-[#deded5] bg-white p-4 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                  {/* Status Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: "all", label: "All Tickets", count: tickets.length },
                        { id: "open", label: "Open", count: stats.openTicketsCount },
                        { id: "in_progress", label: "In Progress", count: stats.inProgressTicketsCount },
                        { id: "resolved", label: "Resolved", count: stats.resolvedTicketsCount },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTicketStatusFilter(f.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          ticketStatusFilter === f.id
                            ? "bg-[#1e3232] text-[#f7f6f2] shadow-xs"
                            : "bg-[#f4f2ea] text-[#526054] hover:bg-[#eae6db]"
                        }`}
                      >
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>

                  {/* Category Filter + Search Input */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <select
                      className="rounded-xl border border-[#d8d3c5] bg-[#faf9f5] px-3 py-2 text-xs text-[#1e3232] focus:outline-none focus:ring-2 focus:ring-[#069f7d]/30"
                      value={ticketCategoryFilter}
                      onChange={(e) => setTicketCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      <option value="order_issue">Order Issue</option>
                      <option value="payment_issue">Payment Issue</option>
                      <option value="delivery_question">Delivery &amp; Logistics</option>
                      <option value="product_question">Product Sourcing</option>
                      <option value="coupon_issue">Coupon &amp; Rebate</option>
                      <option value="other">General Inquiry</option>
                    </select>

                    <div className="relative min-w-[260px]">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e9c90]"
                      />
                      <input
                        type="text"
                        placeholder="Search ref, customer, order, notes..."
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        className="w-full rounded-xl border border-[#d8d3c5] bg-[#faf9f5] pl-8 pr-7 py-2 text-xs text-[#1e3232] placeholder-[#8e9c90] focus:outline-none focus:ring-2 focus:ring-[#069f7d]/30"
                      />
                      {ticketSearch && (
                        <button
                          type="button"
                          onClick={() => setTicketSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8e9c90] hover:text-[#1e3232]"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tickets Table */}
              <div className="rounded-2xl border border-[#deded5] bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#eeeae0] bg-[#faf9f5] text-[11px] font-bold uppercase tracking-wider text-[#6e7a70]">
                      <tr>
                        <th className="px-5 py-3.5">Ticket Ref</th>
                        <th className="px-4 py-3.5">Customer</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">Summary / Issue</th>
                        <th className="px-4 py-3.5">Linked Order</th>
                        <th className="px-4 py-3.5">Created</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eeeae0]">
                      {filteredTickets.map((t) => {
                        const isUpdating = updatingTicketId === t.id;
                        return (
                          <tr
                            key={t.id}
                            className="hover:bg-[#faf9f5]/70 transition cursor-pointer"
                            onClick={() => setSelectedTicket(t)}
                          >
                            {/* Ticket Reference */}
                            <td className="px-5 py-4 font-mono font-bold text-[#1e3232]">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-md bg-[#edf3ef] px-2 py-0.5 text-[11px] text-[#1e3232] border border-[#d2ded6]">
                                  {t.ticketReference}
                                </span>
                              </div>
                            </td>

                            {/* Customer Email */}
                            <td className="px-4 py-4 text-[#1e3232]">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Mail size={12} className="text-[#8e9c90] shrink-0" />
                                <span className="truncate max-w-[170px]" title={t.customerEmail}>
                                  {t.customerEmail}
                                </span>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase border ${
                                  t.category === "payment_issue"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : t.category === "order_issue"
                                    ? "bg-sky-50 text-sky-800 border-sky-200"
                                    : t.category === "delivery_question"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : t.category === "product_question"
                                    ? "bg-purple-50 text-purple-800 border-purple-200"
                                    : t.category === "coupon_issue"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-zinc-100 text-zinc-700 border-zinc-200"
                                }`}
                              >
                                {ticketCategoryLabels[t.category] || t.category}
                              </span>
                            </td>

                            {/* Issue Text */}
                            <td className="px-4 py-4 text-[#526054] max-w-[280px]">
                              <p className="line-clamp-2 leading-relaxed text-[11px]">
                                {t.issueText}
                              </p>
                            </td>

                            {/* Linked Order */}
                            <td className="px-4 py-4">
                              {t.orderReference ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab("orders");
                                    setOrderStatusFilter("All");
                                    setOrderSearch(t.orderReference || "");
                                  }}
                                  className="font-mono text-[11px] font-semibold text-[#069f7d] hover:underline inline-flex items-center gap-1"
                                  title="Filter orders tab for this order"
                                >
                                  {t.orderReference}
                                  <ExternalLink size={10} />
                                </button>
                              ) : (
                                <span className="text-[#b0a999]">—</span>
                              )}
                            </td>

                            {/* Created At */}
                            <td className="px-4 py-4 text-[11px] text-[#6e7a70] whitespace-nowrap">
                              {formatDate(t.createdAt)}
                            </td>

                            {/* Status Selector */}
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block">
                                <select
                                  disabled={isUpdating}
                                  value={t.status}
                                  onChange={(e) =>
                                    handleTicketStatusChange(t.id, e.target.value as TicketStatus)
                                  }
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-offset-1 ${
                                    t.status === "open"
                                      ? "bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-500"
                                      : t.status === "in_progress"
                                      ? "bg-blue-50 text-blue-800 border-blue-300 focus:ring-blue-500"
                                      : t.status === "resolved"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500"
                                      : "bg-gray-100 text-gray-700 border-gray-300 focus:ring-gray-500"
                                  } ${isUpdating ? "opacity-50" : ""}`}
                                >
                                  <option value="open">Open</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTicket(t)}
                                  className="rounded-lg border border-[#d8d3c5] bg-[#faf9f5] px-2.5 py-1 text-[11px] font-semibold text-[#1e3232] hover:bg-[#eeeae0] transition"
                                >
                                  View Details
                                </button>
                                <a
                                  href={`mailto:${t.customerEmail}?subject=Support Ticket ${t.ticketReference} - Culrica Commerce`}
                                  className="rounded-lg border border-[#d8d3c5] bg-[#faf9f5] p-1.5 text-[#526054] hover:text-[#069f7d] hover:bg-[#eeeae0] transition"
                                  title="Email customer"
                                >
                                  <Mail size={13} />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredTickets.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-16 text-center">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <LifeBuoy size={28} className="text-[#8e9c90]" />
                              <p className="text-sm font-semibold text-[#1e3232]">
                                No customer support tickets found
                              </p>
                              <p className="text-xs text-[#8e9c90] max-w-sm">
                                {ticketSearch || ticketStatusFilter !== "all" || ticketCategoryFilter !== "all"
                                  ? "Try loosening your search query or filters to see more tickets."
                                  : "Support inquiries received via Ada or the customer desk will appear here automatically."}
                              </p>
                            </div>
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
              className="fixed inset-0 bg-[#152525]/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative z-10 flex h-full w-full max-w-[580px] flex-col bg-[#fcfbfa] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#deded5] px-7 py-5 bg-white">
                <div>
                  <span className="eyebrow text-[#069f7d]">Catalogue Management</span>
                  <h3 className="font-serif-custom text-2xl font-bold text-[#1e3232] mt-0.5">
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
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value as ProductInput["category"] })}
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
                  <div className="rounded-2xl border border-[#deded5] bg-white p-4 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-[#1e3232]">Publish on Storefront &amp; API</p>
                        <p className="text-[11px] text-[#6e7a70]">Hidden produce will not be visible to customers.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={productForm.isActive}
                        onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                        className="h-5 w-5 accent-[#1e3232]"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-[#eeeae0]">
                      <div>
                        <p className="text-xs font-bold text-[#1e3232]">Featured Produce</p>
                        <p className="text-[11px] text-[#6e7a70]">Highlight this produce at the top of the catalogue.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={productForm.isFeatured}
                        onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                        className="h-5 w-5 accent-[#1e3232]"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-[#deded5] bg-white px-7 py-4">
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
              className="fixed inset-0 bg-[#152525]/65 backdrop-blur-xs"
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
              <h3 className="font-serif-custom text-2xl font-bold text-[#1e3232]">
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
              className="fixed inset-0 bg-[#152525]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[480px] rounded-3xl bg-white p-7 shadow-2xl border border-[#deded5]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#eeeae0]">
                <div>
                  <span className="eyebrow text-[#069f7d]">Stock Adjustment</span>
                  <h3 className="font-serif-custom text-xl font-bold text-[#1e3232]">
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
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value as typeof adjustForm.reason })}
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
              className="fixed inset-0 bg-[#152525]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[500px] rounded-3xl bg-white p-7 shadow-2xl border border-[#deded5]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#eeeae0]">
                <div>
                  <span className="eyebrow text-[#069f7d]">Discount Rules</span>
                  <h3 className="font-serif-custom text-xl font-bold text-[#1e3232]">
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
                      onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as CouponInput["discountType"] })}
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

                <div className="rounded-2xl border border-[#deded5] bg-[#faf9f5] p-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-[#1e3232]">Coupon Active</span>
                    <input
                      type="checkbox"
                      checked={couponForm.isActive}
                      onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                      className="h-4 w-4 accent-[#1e3232]"
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
              className="fixed inset-0 bg-[#152525]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[420px] rounded-3xl bg-white p-7 shadow-2xl border border-red-200"
            >
              <h3 className="font-serif-custom text-xl font-bold text-[#1e3232]">
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
              className="fixed inset-0 bg-[#152525]/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative z-10 flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#deded5] px-7 py-5 bg-[#faf9f5]">
                <div>
                  <span className="eyebrow text-[#069f7d]">Wholesale Order</span>
                  <h3 className="font-mono text-xl font-bold text-[#1e3232] mt-0.5">
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
                <div className="rounded-2xl border border-[#deded5] bg-[#faf9f5] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7a70]">
                        Fulfilment Status
                      </span>
                      <p className="text-base font-bold text-[#1e3232] capitalize">
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
                <div className="grid sm:grid-cols-2 gap-4 rounded-2xl border border-[#deded5] bg-white p-5">
                  <div>
                    <h4 className="font-bold text-[#1e3232] uppercase tracking-wider text-[11px] mb-2">
                      Customer
                    </h4>
                    <p className="font-bold text-sm text-[#1e3232]">{viewOrder.customerName}</p>
                    <p className="text-[#6e7a70]">{viewOrder.customerEmail}</p>
                    <p className="text-[#6e7a70]">{viewOrder.customerPhone}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1e3232] uppercase tracking-wider text-[11px] mb-2">
                      Delivery Destination
                    </h4>
                    <p className="text-[#1e3232] font-medium">{viewOrder.shippingAddress}</p>
                    <p className="text-[#6e7a70]">{viewOrder.shippingCity}, {viewOrder.shippingState}</p>
                    {viewOrder.notes && (
                      <p className="mt-1 text-[11px] italic text-[#6e7a70]">Note: {viewOrder.notes}</p>
                    )}
                  </div>
                </div>

                {/* Produce Lines */}
                <div>
                  <h4 className="font-bold text-[#1e3232] uppercase tracking-wider text-[11px] mb-3">
                    Produce Items
                  </h4>
                  <div className="divide-y divide-[#eeeae0] rounded-2xl border border-[#deded5] overflow-hidden">
                    {viewOrder.items.map((line) => (
                      <div key={line.id} className="p-3.5 flex items-center justify-between bg-white">
                        <div>
                          <p className="font-bold text-[#1e3232]">{line.name}</p>
                          <p className="text-[11px] text-[#6e7a70]">
                            SKU: {line.sku} · {naira(line.priceNgn)} / kg
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xs text-[#1e3232]">{line.quantityKg} kg</p>
                          <p className="text-xs font-bold text-[#1e3232]">{naira(line.lineTotalNgn)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="rounded-2xl border border-[#deded5] bg-[#faf9f5] p-5 space-y-2">
                  <div className="flex justify-between text-[#6e7a70]">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#1e3232]">{naira(viewOrder.subtotalNgn)}</span>
                  </div>
                  {viewOrder.discountNgn > 0 && (
                    <div className="flex justify-between text-[#069f7d] font-semibold">
                      <span>Coupon Discount ({viewOrder.couponCode})</span>
                      <span>-{naira(viewOrder.discountNgn)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6e7a70]">
                    <span>Dispatch Freight</span>
                    <span className="font-bold text-[#1e3232]">
                      {viewOrder.deliveryNgn > 0 ? naira(viewOrder.deliveryNgn) : "Free"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#eeeae0] pt-2 font-bold text-[15px] text-[#1e3232]">
                    <span>Total Amount</span>
                    <span>{naira(viewOrder.totalNgn)}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Close */}
              <div className="p-5 border-t border-[#deded5] bg-white flex justify-end">
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

      {/* ------------------- DRAWER: SUPPORT TICKET DETAILS ------------------- */}
      <AnimatePresence>
        {selectedTicket !== null && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="fixed inset-0 bg-[#152525]/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative z-10 flex h-full w-full max-w-[580px] flex-col bg-[#fcfbfa] shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#deded5] px-7 py-5 bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="eyebrow text-[#069f7d]">Support Ticket</span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase border ${
                        selectedTicket.status === "open"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : selectedTicket.status === "in_progress"
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : selectedTicket.status === "resolved"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-gray-100 text-gray-700 border-gray-300"
                      }`}
                    >
                      {ticketStatusLabels[selectedTicket.status]}
                    </span>
                  </div>
                  <h3 className="font-mono text-xl font-bold text-[#1e3232] mt-0.5">
                    {selectedTicket.ticketReference}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e2ded4] text-[#6e7a70] hover:text-[#1e3232] transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-7 space-y-6">
                {/* Status Switcher Actions */}
                <div className="rounded-2xl border border-[#deded5] bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1e3232]">Update Ticket Status</span>
                    {updatingTicketId === selectedTicket.id && (
                      <span className="text-[11px] text-[#069f7d] flex items-center gap-1 font-semibold">
                        <RefreshCw size={11} className="animate-spin" /> Saving...
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={updatingTicketId === selectedTicket.id || selectedTicket.status === "open"}
                      onClick={() => handleTicketStatusChange(selectedTicket.id, "open")}
                      className={`rounded-xl py-2 px-3 text-xs font-bold border transition text-center ${
                        selectedTicket.status === "open"
                          ? "bg-amber-100 text-amber-900 border-amber-300 shadow-xs"
                          : "bg-[#faf9f5] text-[#526054] border-[#deded5] hover:bg-[#eeeae0]"
                      }`}
                    >
                      Mark Open
                    </button>
                    <button
                      type="button"
                      disabled={updatingTicketId === selectedTicket.id || selectedTicket.status === "in_progress"}
                      onClick={() => handleTicketStatusChange(selectedTicket.id, "in_progress")}
                      className={`rounded-xl py-2 px-3 text-xs font-bold border transition text-center ${
                        selectedTicket.status === "in_progress"
                          ? "bg-blue-100 text-blue-900 border-blue-300 shadow-xs"
                          : "bg-[#faf9f5] text-[#526054] border-[#deded5] hover:bg-[#eeeae0]"
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      disabled={updatingTicketId === selectedTicket.id || selectedTicket.status === "resolved"}
                      onClick={() => handleTicketStatusChange(selectedTicket.id, "resolved")}
                      className={`rounded-xl py-2 px-3 text-xs font-bold border transition text-center ${
                        selectedTicket.status === "resolved"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs"
                          : "bg-[#faf9f5] text-[#526054] border-[#deded5] hover:bg-[#eeeae0]"
                      }`}
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>

                {/* Customer & Ticket Metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#deded5] bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6e7a70]">
                      Customer Email
                    </p>
                    <p className="mt-1 font-semibold text-xs text-[#1e3232] truncate" title={selectedTicket.customerEmail}>
                      {selectedTicket.customerEmail}
                    </p>
                    <a
                      href={`mailto:${selectedTicket.customerEmail}?subject=Update on Ticket ${selectedTicket.ticketReference} - Culrica Commerce`}
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#069f7d] hover:underline"
                    >
                      <Mail size={12} />
                      Send Email
                    </a>
                  </div>

                  <div className="rounded-2xl border border-[#deded5] bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6e7a70]">
                      Inquiry Category
                    </p>
                    <p className="mt-1 font-semibold text-xs text-[#1e3232]">
                      {ticketCategoryLabels[selectedTicket.category] || selectedTicket.category}
                    </p>
                    <p className="mt-1 text-[10px] text-[#8e9c90]">
                      Filed via Chord MCP / Storefront
                    </p>
                  </div>
                </div>

                {/* Linked Order Section */}
                <div className="rounded-2xl border border-[#deded5] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#6e7a70]">
                        Linked Order
                      </p>
                      {selectedTicket.orderReference ? (
                        <p className="mt-1 font-mono font-bold text-sm text-[#1e3232]">
                          {selectedTicket.orderReference}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[#8e9c90]">
                          No specific order reference linked to this ticket.
                        </p>
                      )}
                    </div>
                    {selectedTicket.orderReference && (
                      <button
                        type="button"
                        onClick={() => {
                          const ref = selectedTicket.orderReference || "";
                          setSelectedTicket(null);
                          setActiveTab("orders");
                          setOrderStatusFilter("All");
                          setOrderSearch(ref);
                        }}
                        className="rounded-xl border border-[#069f7d] bg-[#e8f5ee] px-3 py-1.5 text-xs font-bold text-[#069f7d] hover:bg-[#d5eee0] transition flex items-center gap-1.5"
                      >
                        Find in Orders
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Issue Description */}
                <div className="rounded-2xl border border-[#deded5] bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6e7a70]">
                      Issue Description / Request
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTicket.issueText);
                        showNotice("Issue text copied to clipboard.");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6e7a70] hover:text-[#1e3232]"
                    >
                      <Copy size={11} /> Copy
                    </button>
                  </div>
                  <div className="rounded-xl border border-[#eeeae0] bg-[#faf9f5] p-4 font-sans text-xs text-[#1e3232] leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.issueText}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="rounded-2xl border border-[#eeeae0] bg-[#faf9f5] p-4 text-[11px] text-[#6e7a70] space-y-1">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium text-[#1e3232]">{formatDate(selectedTicket.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span className="font-medium text-[#1e3232]">{formatDate(selectedTicket.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-[#deded5] bg-white flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTicket.ticketReference);
                    showNotice(`Ticket reference ${selectedTicket.ticketReference} copied!`);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#526054] hover:text-[#1e3232]"
                >
                  <Copy size={13} />
                  Copy Reference
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
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

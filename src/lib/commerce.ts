import { z } from "zod";

/* ----------------------------- Coupons ----------------------------- */

export type DiscountType = "percent" | "fixed";
export type Coupon = {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minSubtotalNgn: number;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const optionalDate = z.union([z.literal(""), z.null(), z.string().datetime({ offset: true })]).optional()
  .transform((v) => (v ? v : null));

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "Codes use 3–32 letters, numbers, - or _"),
  description: z.string().trim().max(160).default(""),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.coerce.number().int().min(1).max(100000000),
  minSubtotalNgn: z.coerce.number().int().min(0).max(100000000).default(0),
  maxRedemptions: z.union([z.null(), z.literal(""), z.coerce.number().int().min(1).max(1000000)]).optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z.boolean()
}).refine((c) => c.discountType !== "percent" || c.discountValue <= 100, { message: "Percentage discounts cannot exceed 100%", path: ["discountValue"] })
  .refine((c) => !c.startsAt || !c.endsAt || new Date(c.endsAt) > new Date(c.startsAt), { message: "End date must be after the start date", path: ["endsAt"] });
export type CouponInput = z.infer<typeof couponSchema>;

export type CouponState = "active" | "scheduled" | "expired" | "exhausted" | "disabled";
export function couponState(c: Coupon, now = new Date()): CouponState {
  if (!c.isActive) return "disabled";
  if (c.maxRedemptions !== null && c.redemptions >= c.maxRedemptions) return "exhausted";
  if (c.endsAt && new Date(c.endsAt) <= now) return "expired";
  if (c.startsAt && new Date(c.startsAt) > now) return "scheduled";
  return "active";
}

/** Returns the discount in NGN, or an error message explaining why the coupon cannot apply. */
export function evaluateCoupon(c: Coupon | null, subtotalNgn: number, now = new Date()): { ok: true; discountNgn: number } | { ok: false; error: string } {
  if (!c) return { ok: false, error: "That code isn't valid." };
  const state = couponState(c, now);
  if (state === "disabled" || state === "expired") return { ok: false, error: "This code has expired." };
  if (state === "scheduled") return { ok: false, error: "This code isn't active yet." };
  if (state === "exhausted") return { ok: false, error: "This code has reached its usage limit." };
  if (subtotalNgn < c.minSubtotalNgn) {
    return { ok: false, error: `Spend ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(c.minSubtotalNgn)} or more to use this code.` };
  }
  const raw = c.discountType === "percent" ? Math.floor((subtotalNgn * c.discountValue) / 100) : c.discountValue;
  return { ok: true, discountNgn: Math.max(0, Math.min(raw, subtotalNgn)) };
}

/* ------------------------------ Orders ----------------------------- */

export const orderStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const paymentStatuses = ["unpaid", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export type OrderItem = {
  id: string;
  productId: string | null;
  sku: string;
  name: string;
  imageSrc: string;
  priceNgn: number;
  quantityKg: number;
  lineTotalNgn: number;
};

export type Order = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  notes: string;
  subtotalNgn: number;
  discountNgn: number;
  deliveryNgn: number;
  totalNgn: number;
  couponCode: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  paidAt: string | null;
  stockDeducted: boolean;
  couponRedeemed: boolean;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export const statusLabel: Record<OrderStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled"
};
export const paymentLabel: Record<PaymentStatus, string> = {
  unpaid: "Awaiting payment", paid: "Paid", failed: "Failed", refunded: "Refunded"
};

export const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara"
] as const;

export const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantityKg: z.coerce.number().int().min(1).max(1000000)
  })).min(1, "Your cart is empty").max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(160),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
    address: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(80),
    state: z.enum(nigerianStates),
    notes: z.string().trim().max(500).default("")
  }),
  couponCode: z.string().trim().toUpperCase().max(32).optional().transform((v) => v || undefined)
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* ---------------------------- Inventory ---------------------------- */

export const movementReasons = ["restock", "adjustment", "damage", "order", "order_cancelled", "initial"] as const;
export type MovementReason = (typeof movementReasons)[number];
export const manualReasons = ["restock", "adjustment", "damage"] as const;
export const reasonLabel: Record<MovementReason, string> = {
  restock: "Restock", adjustment: "Adjustment", damage: "Damage / loss", order: "Order fulfilled",
  order_cancelled: "Order cancelled", initial: "Opening stock"
};

export type InventoryMovement = {
  id: string;
  productId: string | null;
  sku: string;
  productName: string;
  deltaKg: number;
  stockAfterKg: number;
  reason: MovementReason;
  note: string;
  orderId: string | null;
  createdAt: string;
};

export const stockAdjustmentSchema = z.object({
  deltaKg: z.coerce.number().int().min(-1000000).max(1000000).refine((v) => v !== 0, "Change must not be zero"),
  reason: z.enum(manualReasons),
  note: z.string().trim().max(200).default("")
});

/* ------------------------- Customer Support ------------------------- */

export const ticketCategories = [
  "order_issue",
  "payment_issue",
  "delivery_question",
  "product_question",
  "coupon_issue",
  "other"
] as const;
export type TicketCategory = (typeof ticketCategories)[number];

export const ticketCategoryLabels: Record<TicketCategory, string> = {
  order_issue: "Order Issue",
  payment_issue: "Payment Issue",
  delivery_question: "Delivery & Logistics",
  product_question: "Product Sourcing",
  coupon_issue: "Coupon & Rebate",
  other: "General Inquiry"
};

export const ticketStatuses = ["open", "in_progress", "resolved"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved"
};

export type SupportTicket = {
  id: string;
  ticketReference: string;
  customerEmail: string;
  orderId: string | null;
  orderReference?: string | null;
  category: TicketCategory;
  issueText: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

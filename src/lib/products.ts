import { z } from "zod";

export const categories = [
  "Flowers & Botanicals",
  "Roots & Spices",
  "Seeds & Grains",
  "Nuts & Legumes",
  "Oils & Butters",
  "Fresh Produce"
] as const;
export type Category = (typeof categories)[number];

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: Category;
  origin: string;
  priceNgn: number;
  stockKg: number;
  minOrderKg: number;
  imageSrc: string;
  isActive: boolean;
  isFeatured: boolean;
  updatedAt: string;
};

/** Default photography per category, used when an admin does not supply an image URL. */
export const imageForCategory = (category: Category) => {
  switch (category) {
    case "Flowers & Botanicals": return "/products/hibiscus.jpg";
    case "Roots & Spices": return "/products/ginger.jpg";
    case "Seeds & Grains": return "/products/sesame.jpg";
    case "Fresh Produce": return "/images/hero-farm.jpg";
    default: return "/images/hero-market.jpg";
  }
};

/** Local paths ("/products/x.jpg") or absolute https URLs only. */
const imageField = z.string().trim().max(500)
  .refine((v) => v === "" || v.startsWith("/") || /^https:\/\/[^\s]+$/i.test(v), "Use an https:// image URL or a local /path")
  .optional();

export const productSchema = z.object({
  sku: z.string().trim().min(3).max(25).regex(/^[A-Z0-9-]+$/),
  name: z.string().trim().min(3).max(90),
  tagline: z.string().trim().max(100),
  description: z.string().trim().min(8).max(650),
  category: z.enum(categories),
  origin: z.string().trim().min(2).max(100),
  priceNgn: z.coerce.number().int().min(1).max(100000000),
  stockKg: z.coerce.number().int().min(0).max(1000000),
  minOrderKg: z.coerce.number().int().min(1).max(1000000),
  imageSrc: imageField,
  isActive: z.boolean(),
  isFeatured: z.boolean()
});
export type ProductInput = z.infer<typeof productSchema>;

export function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

export const seededProducts: Product[] = [
  {
    id: "2e6d756e-cda4-4da4-a747-022345ecd001", sku: "HIB-STD", slug: "dried-hibiscus",
    name: "Dried Hibiscus Flower", tagline: "Deep colour. Clean, beautiful petals.",
    description: "Carefully sorted dried hibiscus, suited to zobo producers, tea blenders and other beverage businesses. Sample product data for the TSG Labs exercise.",
    category: "Flowers & Botanicals", origin: "Northern Nigeria", priceNgn: 8500, stockKg: 30,
    minOrderKg: 1, imageSrc: "/products/hibiscus.jpg", isActive: true, isFeatured: true,
    updatedAt: "2026-10-24T00:00:00.000Z"
  },
  {
    id: "2e6d756e-cda4-4da4-a747-022345ecd002", sku: "GIN-DRY", slug: "dried-ginger",
    name: "Dried Ginger", tagline: "A warm staple, ready for your next batch.",
    description: "Cleaned, dried ginger for food manufacturers, spice merchants and wholesalers. Sample product data for the TSG Labs exercise.",
    category: "Roots & Spices", origin: "Kaduna, Nigeria", priceNgn: 6500, stockKg: 40,
    minOrderKg: 1, imageSrc: "/products/ginger.jpg", isActive: true, isFeatured: false,
    updatedAt: "2026-10-24T00:00:00.000Z"
  },
  {
    id: "2e6d756e-cda4-4da4-a747-022345ecd003", sku: "SES-WHT", slug: "white-sesame-seeds",
    name: "White Sesame Seeds", tagline: "Simply sourced. Carefully selected.",
    description: "Cleaned white sesame seeds suited to food processors and wholesale buyers. Sample product data for the TSG Labs exercise.",
    category: "Seeds & Grains", origin: "Nasarawa, Nigeria", priceNgn: 5500, stockKg: 75,
    minOrderKg: 1, imageSrc: "/products/sesame.jpg", isActive: true, isFeatured: false,
    updatedAt: "2026-10-24T00:00:00.000Z"
  }
];

export const naira = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export const LOW_STOCK_KG = 10;

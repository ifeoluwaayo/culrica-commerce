"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, ArrowUpDown, Sparkles } from "lucide-react";
import { ProductCard } from "./product-card";
import { categories, type Product } from "@/lib/products";

export function Catalogue({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "stock-desc">("featured");

  const filterTabs = ["All", ...categories];

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
        const matchesSearch =
          `${p.name} ${p.tagline} ${p.description} ${p.sku} ${p.origin} ${p.category}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesStock = !onlyInStock || p.stockKg > 0;
        return matchesCategory && matchesSearch && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === "featured") {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        }
        if (sortBy === "price-asc") return a.priceNgn - b.priceNgn;
        if (sortBy === "price-desc") return b.priceNgn - a.priceNgn;
        if (sortBy === "stock-desc") return b.stockKg - a.stockKg;
        return 0;
      });
  }, [products, search, selectedCategory, onlyInStock, sortBy]);

  return (
    <section id="catalogue" className="scroll-mt-24 pt-12 pb-20">
      <div className="container-main">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end border-b border-[#e8e5dc] pb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="eyebrow text-[#069f7d]">Wholesale Harvest Catalogue</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf4ec] px-2 py-0.5 text-[10px] font-bold text-[#143522]">
                <Sparkles size={11} className="text-[#069f7d]" />
                Live Stock
              </span>
            </div>
            <h2 className="font-serif-custom mt-2 text-[clamp(32px,3.8vw,52px)] font-normal leading-[1.08] tracking-tight text-[#101c14]">
              Cleaned, sorted & <em className="font-normal italic text-[#069f7d]">ready to ship.</em>
            </h2>
            <p className="mt-2 text-[14px] text-[#6e7a70] max-w-[540px]">
              Browse verified agricultural ingredients with direct farm-origin transparency, live kilogram quantities, and standard wholesale pricing.
            </p>
          </div>

          {/* Search bar & Sorting */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-[280px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e9c90]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search produce, origin, SKU..."
                className="field pl-9! pr-9! text-xs rounded-full h-11"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e9c90] hover:text-[#101c14]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="field sm:w-[170px] text-xs rounded-full h-11"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-desc">Highest Stock (kg)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal size={15} className="mr-1 text-[#6e7a70]" />
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedCategory(tab)}
                className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-all ${
                  selectedCategory === tab
                    ? "bg-[#143522] text-white shadow-xs"
                    : "border border-[#e2ded4] bg-white text-[#546256] hover:border-[#143522]/40"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-[#6e7a70]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="h-4 w-4 rounded accent-[#143522]"
              />
              <span>In stock only</span>
            </label>
            <span>{filtered.length} product{filtered.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        {/* Product Cards Grid */}
        {filtered.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-[#cfc9bb] bg-white p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f0ece1] text-[#6e7a70] mb-3">
              <Search size={22} />
            </div>
            <h3 className="font-serif-custom text-xl font-bold text-[#101c14]">No produce matches your filters</h3>
            <p className="mt-1 text-sm text-[#6e7a70]">
              Try clearing your search term or switching to another category.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
                setOnlyInStock(false);
              }}
              className="btn-outline mt-5 text-xs"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

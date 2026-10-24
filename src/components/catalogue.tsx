"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { ProductCard } from "./product-card";
import { categories, type Product } from "@/lib/products";

type Sort = "featured" | "price-asc" | "price-desc" | "stock-desc";

export function Catalogue({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All produce");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");
  const filtered = useMemo(() => products.filter(product =>
    (category === "All produce" || product.category === category) &&
    (!onlyInStock || product.stockKg >= product.minOrderKg) &&
    `${product.name} ${product.tagline} ${product.description} ${product.origin} ${product.sku}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => sort === "price-asc" ? a.priceNgn - b.priceNgn : sort === "price-desc" ? b.priceNgn - a.priceNgn : sort === "stock-desc" ? b.stockKg - a.stockKg : Number(b.isFeatured) - Number(a.isFeatured)), [products, category, onlyInStock, search, sort]);
  const reset = () => { setSearch(""); setCategory("All produce"); setOnlyInStock(false); };

  return <section id="catalogue" className="marketplace section-gutter">
    <div className="marketplace-heading"><div><span className="eyebrow">Discover the harvest</span><h2>Locally grown.<br /><em>Ready for your world.</em></h2></div><p>A considered selection of agricultural ingredients.<br />Clear pricing. Available stock. Possibility by the kilogram.</p></div>
    <div className="marketplace-toolbar"><div className="category-tabs" role="group" aria-label="Filter by produce category">{["All produce", ...categories].map(tab => <button key={tab} aria-pressed={category === tab} className={category === tab ? "selected" : ""} onClick={() => setCategory(tab)}>{tab}{category === tab && <span>{filtered.length.toString().padStart(2, "0")}</span>}</button>)}</div><div className="market-search"><Search size={16} /><input aria-label="Search produce" placeholder="Find your ingredients" value={search} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={15} /></button>}</div></div>
    <div className="marketplace-results"><span>{filtered.length.toString().padStart(2, "0")} ingredients to explore</span><div><label className="stock-toggle"><input type="checkbox" checked={onlyInStock} onChange={event => setOnlyInStock(event.target.checked)} /> Available now</label><label className="sort-label">Sort by <select aria-label="Sort produce" value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="stock-desc">Available quantity</option></select></label></div></div>
    {filtered.length ? <div className="product-grid">{filtered.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="marketplace-empty"><Search size={32} strokeWidth={1} /><h3>A fresh search might help.</h3><p>We couldn’t find ingredients matching your selection.</p><button onClick={reset} className="text-link">Explore all produce <ArrowRight size={15} /></button></div>}
    <div className="marketplace-note"><span>From our growing regions to your next big idea.</span><span>Prices in NGN · Whole-kilogram orders</span></div>
  </section>;
}

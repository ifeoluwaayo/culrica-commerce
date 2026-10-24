# Culrica Commerce · Phase 1

A small, real Next.js 16 App Router storefront and inventory admin for the TSG Labs/Chord exercise. **This phase does not accept orders or payments.** It gives the Chord teammate a merchant catalogue and a persistent source of stock/price truth in Phase 2.

## What's included

- Elegant responsive public storefront with catalogue search, category filters, detailed product pages and current kg quantities.
- Three fictitious products: dried hibiscus, dried ginger and white sesame seeds. All prices, inventory, descriptions and origin labels are test fixtures, **not real Culrica offers**.
- Password-protected `/admin` dashboard with create/edit product, adjust stock and pricing, publish/hide and view inventory summaries.
- Server-side Next.js Route Handlers: `GET /api/products` and `GET /api/products/[slug]` for Chord; authenticated admin routes for mutations.
- Local JSON storage for frictionless local development. Production data is stored in Supabase PostgreSQL, with SQL schema/seed included.
- Original, locally bundled SVG illustrations (no image host dependency).

## Requirements

Node.js 20.9+ (Node 22 LTS recommended), npm and a recent browser.

## Run locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local: set ADMIN_PASSWORD and SESSION_SECRET.
# Leave the two Supabase fields blank to use the local demo store.
npm run dev
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin
- Public API: http://localhost:3000/api/products

For a very quick **development-only** run, omit both admin environment variables; the demo password is `culrica-demo-2026`. In production no fallback password is accepted. Local mutations persist in `data/products.json` and survive dev server restarts; the file is ignored by git. To reset data, stop the server and delete `data/products.json`.

Run `npm run typecheck`, `npm run lint`, and `npm run build` after installing dependencies.

## Supabase and deployment (recommended before connecting Chord)

1. Create a free Supabase project, open SQL Editor and execute `supabase/schema.sql`. This creates the product table and seeds three test products. It enables RLS with **no browser-accessible policies**.
2. Copy the project URL and the server-side **service role/secret key**. Set in `.env.local`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SECRET_KEY
ADMIN_PASSWORD=YOUR_LONG_RANDOM_PASSWORD
SESSION_SECRET=YOUR_RANDOM_32_PLUS_CHARACTER_SECRET
```

3. Restart `npm run dev`. The admin badge will show `Supabase`. Product changes now persist remotely.
4. Deploy to Vercel (or Node hosting), setting all four variables as **server environment variables**, not `NEXT_PUBLIC_` variables. Use a custom domain or the generated HTTPS deployment URL.
5. Verify a change in admin, refresh the product page, and request `/api/products` directly. The quantity should match everywhere.

**Important:** Do not deploy with the local JSON adapter. A serverless filesystem is not a persistent database. Put the Supabase variables in production and keep the service role key exclusively server-side. The current single-admin-password mechanism is suitable for a controlled recruitment demo with fictional data, not for a real merchant team: use named accounts, MFA, audit trails and rate-limiting before customer production use.

## Data model

```
products:
  id           UUID primary key
  sku          unique string
  slug         unique string
  name         string
  tagline      string
  description  string
  category     enum/text
  origin       string
  price_ngn    integer (price PER kg, in NGN)
  stock_kg     non-negative integer
  min_order_kg positive integer
  image_src    local asset path
  is_active    boolean
  is_featured  boolean
  created_at   timestamp
  updated_at   timestamp
```

For this demo, inventory is measured in **whole kilograms** only.

## APIs

### Public and read-only

`GET /api/products` returns `{ "products": [{ "id": "...", "sku": "HIB-STD", "priceNgn": 8500, "stockKg": 30, ... }] }`. Only active products are returned.

`GET /api/products/dried-hibiscus` returns `{ "product": { ... } }` or HTTP 404. Both return `Cache-Control: no-store` / dynamic responses.

### Admin only (browser cookie protected)

- `POST /api/auth/login` `{ "password": "..." }`
- `POST /api/auth/logout`
- `GET /api/admin/products` (includes unpublished products)
- `POST /api/admin/products` (creates a product)
- `PATCH /api/admin/products/:id` (replaces editable fields)

Admin writes are Zod-validated. Product slugs are generated from names, SKU is unique, and unpublished products disappear from public endpoints. All admin routes check a signed HttpOnly session cookie. There is **no public stock-write endpoint**.

## Chord integration next (Phase 2)

The public read API is ready now. In Phase 2, build a **server-to-server** authenticated order tool, rather than exposing order creation to anyone hitting `/api/products`.

Proposed tool boundaries:

1. `search_products` → `GET /api/products` and filter/describe results.
2. `quote_order` → read trusted price and stock and persist a short-lived quote.
3. `place_order` → verify buyer confirmation and quote, create `orders` row, initialize Paystack **test** checkout using trusted backend prices.
4. `verify_order_payment` → independently verify reference, amount, currency, and status; update order and stock atomically/idempotently.

**Do not** decrement stock when the customer is merely browsing or when a payment has not been verified. Phase 2 needs an atomic reservation/deduction design if multiple buyers can purchase concurrently.

## Screens

- `/` - public landing page and filterable catalogue
- `/products/dried-hibiscus` - product detail and quantity price estimator (no checkout)
- `/admin/login` - admin login
- `/admin` - inventory dashboard, add/edit and publish/hide controls

## Notes for TSG Labs

- This project is a **backend/frontend dependency** for the Chord teammate, not the teammate itself. The final submission must still include a *Chord-hosted* agent that invokes a custom tool and performs a real action in the WhatsApp simulator.
- AI-assisted implementation should be disclosed in your final TSG Labs README/submission.
- Replace mock information with authorized real data only after the exercise. Keep this demo inaccessible to actual customers.

-- Run in Supabase SQL Editor.
-- The Next.js server accesses Supabase via the service role key;
-- all customer mutations happen through signed/validated Next.js endpoints.

create extension if not exists pgcrypto;

-- 1. PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  slug text unique not null,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  category text not null,
  origin text not null default 'Nigeria',
  price_ngn integer not null check (price_ngn > 0),
  stock_kg integer not null default 0 check (stock_kg >= 0),
  min_order_kg integer not null default 1 check (min_order_kg >= 1),
  image_src text not null,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. COUPONS
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text not null default '',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  min_subtotal_ngn integer not null default 0 check (min_subtotal_ngn >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemptions integer not null default 0 check (redemptions >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. ORDERS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_state text not null,
  notes text not null default '',
  subtotal_ngn integer not null check (subtotal_ngn >= 0),
  discount_ngn integer not null default 0 check (discount_ngn >= 0),
  delivery_ngn integer not null default 0 check (delivery_ngn >= 0),
  total_ngn integer not null check (total_ngn >= 0),
  coupon_code text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'failed', 'refunded')),
  payment_reference text,
  paid_at timestamptz,
  stock_deducted boolean not null default false,
  coupon_redeemed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. ORDER ITEMS
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  name text not null,
  image_src text not null default '',
  price_ngn integer not null check (price_ngn > 0),
  quantity_kg integer not null check (quantity_kg > 0),
  line_total_ngn integer not null check (line_total_ngn >= 0)
);

-- 5. INVENTORY MOVEMENTS (AUDIT TRAIL)
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  product_name text not null,
  delta_kg integer not null,
  stock_after_kg integer not null check (stock_after_kg >= 0),
  reason text not null check (reason in ('restock', 'adjustment', 'damage', 'order', 'order_cancelled', 'initial')),
  note text not null default '',
  order_id text,
  created_at timestamptz not null default now()
);

-- RLS (Server-only service-role access)
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;

-- 6. STORED PROCEDURES (ATOMIC INVENTORY & ORDER OPERATIONS)

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_delta integer,
  p_reason text,
  p_note text default ''
) returns void language plpgsql as $$
declare
  v_prod record;
  v_new_stock integer;
begin
  select * into v_prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  v_new_stock := v_prod.stock_kg + p_delta;
  if v_new_stock < 0 then
    raise exception 'Stock cannot fall below zero (currently % kg, change % kg)', v_prod.stock_kg, p_delta;
  end if;

  update public.products
  set stock_kg = v_new_stock, updated_at = now()
  where id = p_product_id;

  insert into public.inventory_movements
    (product_id, sku, product_name, delta_kg, stock_after_kg, reason, note)
  values
    (v_prod.id, v_prod.sku, v_prod.name, p_delta, v_new_stock, p_reason, p_note);
end;
$$;

create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_reference text,
  p_amount_ngn integer default null
) returns void language plpgsql as $$
declare
  v_order record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.payment_status = 'paid' then
    return;
  end if;

  if p_amount_ngn is not null and p_amount_ngn <> v_order.total_ngn then
    raise exception 'Amount paid (%) does not match order total (%)', p_amount_ngn, v_order.total_ngn;
  end if;

  update public.orders
  set
    payment_status = 'paid',
    payment_reference = coalesce(p_reference, payment_reference),
    paid_at = coalesce(paid_at, now()),
    updated_at = now()
  where id = p_order_id;

  if v_order.coupon_code is not null and not v_order.coupon_redeemed then
    update public.coupons
    set redemptions = redemptions + 1, updated_at = now()
    where code = v_order.coupon_code;

    update public.orders
    set coupon_redeemed = true
    where id = p_order_id;
  end if;
end;
$$;

create or replace function public.set_order_status(
  p_order_id uuid,
  p_status text
) returns void language plpgsql as $$
declare
  v_order record;
  v_item record;
  v_prod record;
  v_new_stock integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status = p_status then
    return;
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'Cancelled orders cannot be reopened';
  end if;

  if p_status = 'pending' then
    raise exception 'Orders cannot be moved back to pending';
  end if;

  -- 1) Moving to confirmed/shipped/delivered: deduct stock once if not already deducted
  if p_status in ('confirmed', 'shipped', 'delivered') and not v_order.stock_deducted then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      if v_item.product_id is not null then
        select * into v_prod from public.products where id = v_item.product_id for update;
        if found then
          v_new_stock := v_prod.stock_kg - v_item.quantity_kg;
          if v_new_stock < 0 then
            raise exception 'Insufficient stock for % (available: % kg, needed: % kg)', v_prod.name, v_prod.stock_kg, v_item.quantity_kg;
          end if;

          update public.products
          set stock_kg = v_new_stock, updated_at = now()
          where id = v_prod.id;

          insert into public.inventory_movements
            (product_id, sku, product_name, delta_kg, stock_after_kg, reason, note, order_id)
          values
            (v_prod.id, v_prod.sku, v_prod.name, -v_item.quantity_kg, v_new_stock, 'order', v_order.reference, v_order.id::text);
        end if;
      end if;
    end loop;

    update public.orders set stock_deducted = true where id = p_order_id;
  end if;

  -- 2) Cancelling an order that had stock deducted: restore stock
  if p_status = 'cancelled' and v_order.stock_deducted then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      if v_item.product_id is not null then
        select * into v_prod from public.products where id = v_item.product_id for update;
        if found then
          v_new_stock := v_prod.stock_kg + v_item.quantity_kg;
          update public.products set stock_kg = v_new_stock, updated_at = now() where id = v_prod.id;

          insert into public.inventory_movements
            (product_id, sku, product_name, delta_kg, stock_after_kg, reason, note, order_id)
          values
            (v_prod.id, v_prod.sku, v_prod.name, v_item.quantity_kg, v_new_stock, 'order_cancelled', v_order.reference, v_order.id::text);
        end if;
      end if;
    end loop;

    update public.orders set stock_deducted = false where id = p_order_id;
  end if;

  update public.orders set status = p_status, updated_at = now() where id = p_order_id;
end;
$$;

-- Seed initial products
insert into public.products
(id, sku, slug, name, tagline, description, category, origin, price_ngn, stock_kg, min_order_kg, image_src, is_active, is_featured)
values
('2e6d756e-cda4-4da4-a747-022345ecd001','HIB-STD','dried-hibiscus','Dried Hibiscus Flower','Deep colour. Clean, beautiful petals.','Carefully sorted dried hibiscus for zobo producers, tea blenders and beverage businesses. Sample data for the TSG Labs exercise.','Flowers & Botanicals','Northern Nigeria',8500,30,1,'/products/hibiscus.jpg',true,true),
('2e6d756e-cda4-4da4-a747-022345ecd002','GIN-DRY','dried-ginger','Dried Ginger','A warm staple, ready for your next batch.','Cleaned, dried ginger for food manufacturers, spice merchants and wholesalers. Sample data for the TSG Labs exercise.','Roots & Spices','Kaduna, Nigeria',6500,40,1,'/products/ginger.jpg',true,false),
('2e6d756e-cda4-4da4-a747-022345ecd003','SES-WHT','white-sesame-seeds','White Sesame Seeds','Simply sourced. Carefully selected.','Cleaned white sesame seeds for food processors and wholesale buyers. Sample data for the TSG Labs exercise.','Seeds & Grains','Nasarawa, Nigeria',5500,75,1,'/products/sesame.jpg',true,false)
on conflict (id) do nothing;

-- Seed initial promotional coupons
insert into public.coupons
(id, code, description, discount_type, discount_value, min_subtotal_ngn, max_redemptions, redemptions, is_active)
values
('c1111111-cda4-4da4-a747-022345ecd001', 'HARVEST2026', '15% wholesale seasonal discount for food processors', 'percent', 15, 20000, 100, 0, true),
('c1111111-cda4-4da4-a747-022345ecd002', 'WELCOME5K', '₦5,000 off orders over ₦50,000', 'fixed', 5000, 50000, 50, 0, true),
('c1111111-cda4-4da4-a747-022345ecd003', 'CULRICA10', '10% off any order for new produce buyers', 'percent', 10, 0, null, 0, true)
on conflict (id) do nothing;

-- ==============================================================================
-- 6. CHORD COMMERCE TEAMMATE (Phase 2 Additive Objects)
-- ==============================================================================

-- Keep checkout URL so repeated tool calls return the same checkout without reinitializing
alter table public.orders add column if not exists chord_checkout_url text;

-- Durable 15-minute quotes tied to products
create table if not exists public.chord_quotes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  sku text not null,
  product_name text not null,
  quantity_kg integer not null check (quantity_kg between 1 and 1000),
  unit_price_ngn integer not null check (unit_price_ngn > 0),
  subtotal_ngn integer not null check (subtotal_ngn > 0),
  delivery_ngn integer not null check (delivery_ngn >= 0),
  total_ngn integer not null check (total_ngn > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  order_id uuid unique references public.orders(id)
);

alter table public.chord_quotes enable row level security;

-- Function: chord_make_quote
create or replace function public.chord_make_quote(
  p_sku text,
  p_quantity_kg integer
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_quote public.chord_quotes%rowtype;
  v_subtotal integer;
begin
  if p_quantity_kg is null or p_quantity_kg < 1 or p_quantity_kg > 1000 then
    raise exception 'Quantity must be a whole number between 1 and 1000 kg';
  end if;

  select * into v_product
    from public.products
   where upper(sku) = upper(trim(p_sku)) and is_active = true;

  if not found then
    raise exception 'This product is not available';
  end if;
  if p_quantity_kg < v_product.min_order_kg then
    raise exception 'Minimum order for % is % kg', v_product.name, v_product.min_order_kg;
  end if;
  if p_quantity_kg > v_product.stock_kg then
    raise exception 'Only % kg of % is currently available', v_product.stock_kg, v_product.name;
  end if;

  v_subtotal := p_quantity_kg * v_product.price_ngn;
  insert into public.chord_quotes (
    product_id, sku, product_name, quantity_kg, unit_price_ngn,
    subtotal_ngn, delivery_ngn, total_ngn
  ) values (
    v_product.id, v_product.sku, v_product.name, p_quantity_kg,
    v_product.price_ngn, v_subtotal, 2500, v_subtotal + 2500
  ) returning * into v_quote;

  return jsonb_build_object(
    'quoteId', v_quote.id,
    'sku', v_quote.sku,
    'productName', v_quote.product_name,
    'quantityKg', v_quote.quantity_kg,
    'unitPriceNgn', v_quote.unit_price_ngn,
    'subtotalNgn', v_quote.subtotal_ngn,
    'deliveryNgn', v_quote.delivery_ngn,
    'totalNgn', v_quote.total_ngn,
    'deliveryArea', 'Lagos (demo flat rate)',
    'expiresAt', v_quote.expires_at,
    'note', 'This quote does not reserve stock. Availability is checked again when the order is placed.'
  );
end;
$$;

-- Function: chord_place_order
create or replace function public.chord_place_order(
  p_quote_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_state text
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_quote public.chord_quotes%rowtype;
  v_product public.products%rowtype;
  v_order public.orders%rowtype;
  v_reference text;
begin
  select * into v_quote from public.chord_quotes
    where id = p_quote_id for update;
  if not found then
    raise exception 'Quote not found; request a new quotation';
  end if;

  if v_quote.order_id is not null then
    select * into v_order from public.orders where id = v_quote.order_id;
    if lower(v_order.customer_email) <> lower(trim(p_customer_email)) then
      raise exception 'The quote belongs to a different buyer';
    end if;
    return jsonb_build_object(
      'orderId', v_order.id, 'reference', v_order.reference,
      'paymentReference', v_order.payment_reference,
      'totalNgn', v_order.total_ngn,
      'paymentStatus', v_order.payment_status,
      'checkoutUrl', v_order.chord_checkout_url,
      'existing', true
    );
  end if;

  if now() > v_quote.expires_at then
    raise exception 'Quote expired; request an updated quote';
  end if;
  if lower(trim(p_shipping_state)) <> 'lagos' then
    raise exception 'This demo only quotes deliveries within Lagos State';
  end if;
  if trim(coalesce(p_customer_name,'')) = '' or trim(coalesce(p_customer_email,'')) = ''
     or trim(coalesce(p_customer_phone,'')) = '' or trim(coalesce(p_shipping_address,'')) = ''
     or trim(coalesce(p_shipping_city,'')) = '' then
    raise exception 'Customer name, email, phone, street and city are required';
  end if;

  select * into v_product from public.products
    where id = v_quote.product_id for update;
  if not found or not v_product.is_active then
    raise exception 'Product is no longer available';
  end if;
  if v_product.price_ngn <> v_quote.unit_price_ngn then
    raise exception 'Product price changed; request an updated quote';
  end if;
  if v_product.stock_kg < v_quote.quantity_kg then
    raise exception 'Stock changed; only % kg is now available', v_product.stock_kg;
  end if;

  v_reference := 'CHD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  insert into public.orders (
    reference, customer_name, customer_email, customer_phone,
    shipping_address, shipping_city, shipping_state,
    notes, subtotal_ngn, discount_ngn, delivery_ngn, total_ngn,
    status, payment_status, payment_reference
  ) values (
    v_reference, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
    trim(p_shipping_address), trim(p_shipping_city), 'Lagos',
    'Chord WhatsApp exercise; fictional customer data',
    v_quote.subtotal_ngn, 0, v_quote.delivery_ngn, v_quote.total_ngn,
    'pending', 'unpaid', v_reference
  ) returning * into v_order;

  insert into public.order_items (
    order_id, product_id, sku, name, image_src,
    price_ngn, quantity_kg, line_total_ngn
  ) values (
    v_order.id, v_product.id, v_product.sku, v_product.name, v_product.image_src,
    v_quote.unit_price_ngn, v_quote.quantity_kg, v_quote.subtotal_ngn
  );

  update public.chord_quotes set order_id = v_order.id where id = v_quote.id;

  return jsonb_build_object(
    'orderId', v_order.id, 'reference', v_order.reference,
    'paymentReference', v_order.payment_reference,
    'totalNgn', v_order.total_ngn, 'paymentStatus', 'unpaid',
    'checkoutUrl', null, 'existing', false
  );
end;
$$;

revoke all on table public.chord_quotes from anon, authenticated;
revoke all on function public.chord_make_quote(text, integer) from public, anon, authenticated;
revoke all on function public.chord_place_order(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.chord_make_quote(text, integer) to service_role;
grant execute on function public.chord_place_order(uuid, text, text, text, text, text, text) to service_role;



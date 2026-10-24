-- Culrica Chord Phase 2 additive migration.
-- Assumes the user's current products, orders, order_items and inventory functions exist.
-- Run once in Supabase SQL Editor (safe to re-run CREATE IF NOT EXISTS objects).
-- This does NOT modify the existing storefront checkout endpoints.

create extension if not exists pgcrypto;

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

-- Keep checkout URL so that repeated tool calls return the same checkout
-- without initializing a second Paystack transaction.
alter table public.orders add column if not exists chord_checkout_url text;

-- Only server-side service-role calls can create quotes. The model never
-- receives these credentials; authorization happens at the /api/mcp route.
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

-- A single database transaction creates the order and its line item.
-- Locking the quote makes retries idempotent: one quote => at most one order.
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

  -- Even on a retry, validate order ownership. Do not return another buyer's
  -- order or checkout link just because a quote ID was obtained.
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

-- Supabase service role only, not browser/anonymous Supabase clients.
revoke all on table public.chord_quotes from anon, authenticated;
revoke all on function public.chord_make_quote(text, integer) from public, anon, authenticated;
revoke all on function public.chord_place_order(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.chord_make_quote(text, integer) to service_role;
grant execute on function public.chord_place_order(uuid, text, text, text, text, text, text) to service_role;

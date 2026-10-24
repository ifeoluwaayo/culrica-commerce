-- Culrica Phase 2.1: coupon-aware Chord quotes and orders.
-- Apply AFTER original improved Culrica schema AND chord-phase2.sql.
-- Existing website tables and orders are preserved.
-- This migration extends existing chord_quotes and updates only Chord-specific RPCs.

alter table public.chord_quotes
  add column if not exists coupon_code text,
  add column if not exists discount_ngn integer not null default 0
    check (discount_ngn >= 0);

-- New three-argument quote RPC. The original two-argument version can remain
-- for compatibility; the updated MCP tool always calls this signature.
create or replace function public.chord_make_quote(
  p_sku text,
  p_quantity_kg integer,
  p_coupon_code text
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_quote public.chord_quotes%rowtype;
  v_coupon public.coupons%rowtype;
  v_subtotal integer;
  v_discount integer := 0;
  v_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
begin
  if p_quantity_kg is null or p_quantity_kg < 1 or p_quantity_kg > 1000 then
    raise exception 'Quantity must be a whole number between 1 and 1000 kg';
  end if;

  select * into v_product from public.products
  where upper(sku) = upper(trim(p_sku)) and is_active = true;
  if not found then raise exception 'Product is not available'; end if;
  if p_quantity_kg < v_product.min_order_kg then
    raise exception 'Minimum order for % is % kg', v_product.name, v_product.min_order_kg;
  end if;
  if p_quantity_kg > v_product.stock_kg then
    raise exception 'Only % kg of % is available', v_product.stock_kg, v_product.name;
  end if;

  v_subtotal := p_quantity_kg * v_product.price_ngn;
  if v_code is not null then
    select * into v_coupon from public.coupons where upper(code) = v_code;
    if not found or not v_coupon.is_active
      or (v_coupon.starts_at is not null and now() < v_coupon.starts_at)
      or (v_coupon.ends_at is not null and now() > v_coupon.ends_at)
      or (v_coupon.max_redemptions is not null and v_coupon.redemptions >= v_coupon.max_redemptions)
      or v_subtotal < v_coupon.min_subtotal_ngn then
      raise exception 'Coupon is invalid, expired, exhausted or does not meet the minimum spend';
    end if;
    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_subtotal::numeric * least(v_coupon.discount_value, 100) / 100)::integer;
    else
      v_discount := least(v_coupon.discount_value, v_subtotal);
    end if;
  end if;

  insert into public.chord_quotes (
    product_id, sku, product_name, quantity_kg, unit_price_ngn,
    subtotal_ngn, discount_ngn, coupon_code, delivery_ngn, total_ngn
  ) values (
    v_product.id, v_product.sku, v_product.name, p_quantity_kg,
    v_product.price_ngn, v_subtotal, v_discount, v_code, 2500,
    v_subtotal - v_discount + 2500
  ) returning * into v_quote;

  return jsonb_build_object(
    'quoteId', v_quote.id,
    'sku', v_quote.sku,
    'productName', v_quote.product_name,
    'quantityKg', v_quote.quantity_kg,
    'unitPriceNgn', v_quote.unit_price_ngn,
    'subtotalNgn', v_quote.subtotal_ngn,
    'couponCode', v_quote.coupon_code,
    'discountNgn', v_quote.discount_ngn,
    'deliveryNgn', v_quote.delivery_ngn,
    'totalNgn', v_quote.total_ngn,
    'deliveryArea', 'Lagos (demo flat rate)',
    'expiresAt', v_quote.expires_at,
    'note', 'Quote does not reserve inventory or coupon capacity. Both are rechecked at order placement.'
  );
end;
$$;

-- Update the existing idempotent order RPC to copy the validated coupon and
-- discounted amount from the saved quote, never from agent-supplied totals.
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
  v_coupon public.coupons%rowtype;
  v_order public.orders%rowtype;
  v_reference text;
  v_discount integer := 0;
begin
  select * into v_quote from public.chord_quotes where id = p_quote_id for update;
  if not found then raise exception 'Quote not found; request a new quotation'; end if;

  -- Quote IDs are idempotency keys, including after a quote expires.
  if v_quote.order_id is not null then
    select * into v_order from public.orders where id = v_quote.order_id;
    if lower(v_order.customer_email) <> lower(trim(p_customer_email)) then
      raise exception 'The quote belongs to a different buyer';
    end if;
    return jsonb_build_object(
      'orderId', v_order.id, 'reference', v_order.reference,
      'paymentReference', v_order.payment_reference,
      'totalNgn', v_order.total_ngn, 'discountNgn', v_order.discount_ngn,
      'couponCode', v_order.coupon_code,
      'paymentStatus', v_order.payment_status,
      'checkoutUrl', v_order.chord_checkout_url, 'existing', true
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

  select * into v_product from public.products where id = v_quote.product_id for update;
  if not found or not v_product.is_active then
    raise exception 'Product is no longer available';
  end if;
  if v_product.price_ngn <> v_quote.unit_price_ngn then
    raise exception 'Product price changed; request a fresh quote';
  end if;
  if v_product.stock_kg < v_quote.quantity_kg then
    raise exception 'Only % kg is now available; request a fresh quote', v_product.stock_kg;
  end if;

  if v_quote.coupon_code is not null then
    select * into v_coupon from public.coupons
     where upper(code) = upper(v_quote.coupon_code) for update;
    if not found or not v_coupon.is_active
       or (v_coupon.starts_at is not null and now() < v_coupon.starts_at)
       or (v_coupon.ends_at is not null and now() > v_coupon.ends_at)
       or (v_coupon.max_redemptions is not null and v_coupon.redemptions >= v_coupon.max_redemptions)
       or v_quote.subtotal_ngn < v_coupon.min_subtotal_ngn then
      raise exception 'Coupon is no longer eligible; request a new quote';
    end if;
    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_quote.subtotal_ngn::numeric * least(v_coupon.discount_value, 100) / 100)::integer;
    else
      v_discount := least(v_coupon.discount_value, v_quote.subtotal_ngn);
    end if;
    if v_discount <> v_quote.discount_ngn then
      raise exception 'Coupon value changed; request a new quote';
    end if;
  end if;

  if v_quote.total_ngn <> v_quote.subtotal_ngn - v_quote.discount_ngn + v_quote.delivery_ngn then
    raise exception 'Quote totals are inconsistent';
  end if;

  v_reference := 'CHD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  insert into public.orders (
    reference, customer_name, customer_email, customer_phone,
    shipping_address, shipping_city, shipping_state,
    notes, subtotal_ngn, discount_ngn, delivery_ngn, total_ngn,
    coupon_code, status, payment_status, payment_reference
  ) values (
    v_reference, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
    trim(p_shipping_address), trim(p_shipping_city), 'Lagos',
    'Chord WhatsApp exercise; fictional customer data',
    v_quote.subtotal_ngn, v_quote.discount_ngn,
    v_quote.delivery_ngn, v_quote.total_ngn,
    v_quote.coupon_code, 'pending', 'unpaid', v_reference
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
    'totalNgn', v_order.total_ngn, 'discountNgn', v_order.discount_ngn,
    'couponCode', v_order.coupon_code,
    'paymentStatus', 'unpaid', 'checkoutUrl', null, 'existing', false
  );
end;
$$;

revoke all on function public.chord_make_quote(text, integer, text) from PUBLIC, anon, authenticated;
revoke all on function public.chord_place_order(uuid, text, text, text, text, text, text) from PUBLIC, anon, authenticated;
grant execute on function public.chord_make_quote(text, integer, text) to service_role;
grant execute on function public.chord_place_order(uuid, text, text, text, text, text, text) to service_role;

-- The website's existing mark_order_paid function records coupon redemption
-- after Paystack verification. Coupon quotas are checked at quote and order
-- time here, but NOT reserved while an order is awaiting payment.
-- A production implementation must reserve/reconcile capped coupons atomically.

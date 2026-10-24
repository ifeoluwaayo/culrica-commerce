-- Phase 2.2: Minimal recorded support requests for fictional customers.
-- Run after your existing Culrica schema and Phase 2.1 migrations.
-- No changes to existing products, quotes, orders, coupons or payments.

create table if not exists public.chord_support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_reference text not null unique
    default ('SUP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  customer_email text not null,
  order_id uuid references public.orders(id) on delete set null,
  category text not null check (category in (
    'order_issue', 'payment_issue', 'delivery_question',
    'product_question', 'coupon_issue', 'other'
  )),
  issue_text text not null check (char_length(issue_text) between 10 and 500),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chord_support_tickets_order_id_idx
  on public.chord_support_tickets (order_id);
create index if not exists chord_support_tickets_created_at_idx
  on public.chord_support_tickets (created_at desc);

-- Access only through protected Next.js server using service-role key.
-- No browser/anonymous Supabase policies are introduced.
alter table public.chord_support_tickets enable row level security;

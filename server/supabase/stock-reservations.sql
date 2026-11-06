-- Optional owner-paste (Supabase SQL Editor). Safe to re-run.
-- Timed checkout stock holds (~10 minutes). The API also keeps an in-memory /
-- application-level ledger and still reserves via reserve_product_stock or the
-- optimistic stock_quantity compare-and-swap when this table is missing.
--
-- Do not use CREATE INDEX CONCURRENTLY in this file.
-- Also paste reserve-stock.sql if you have not already.

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'held'
    check (status in ('held', 'converted', 'released')),
  items jsonb not null,
  expires_at timestamptz not null,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_reservations_held_expires_idx
  on public.stock_reservations (expires_at)
  where status = 'held';

alter table public.stock_reservations enable row level security;

-- Service role / API only; no public policies.

-- Idempotency keys for POST /api/orders (same key + payload → same order).
create table if not exists public.order_idempotency (
  key text primary key,
  request_hash text not null,
  order_id uuid references public.orders (id) on delete set null,
  response_status int not null,
  response_body jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists order_idempotency_created_at_idx
  on public.order_idempotency (created_at desc);

alter table public.order_idempotency enable row level security;

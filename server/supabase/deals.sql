-- Timed deals (server start/end). Evaluate expiry with server time only.
-- Paste in Supabase SQL Editor. App degrades if table is missing.

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  title text not null default 'Deal',
  deal_price integer not null check (deal_price >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  deal_of_day boolean not null default false,
  member_only boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Compat: older drafts used price_minor
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deals' and column_name = 'price_minor'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deals' and column_name = 'deal_price'
  ) then
    alter table public.deals rename column price_minor to deal_price;
  end if;
end $$;

alter table public.deals add column if not exists title text not null default 'Deal';
alter table public.deals add column if not exists deal_of_day boolean not null default false;
alter table public.deals add column if not exists active boolean not null default true;
alter table public.deals add column if not exists member_only boolean not null default false;

create index if not exists deals_active_window_idx
  on public.deals (starts_at, ends_at);
create index if not exists deals_product_id_idx on public.deals (product_id);

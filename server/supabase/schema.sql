-- Run this in Supabase Dashboard → SQL Editor (https://supabase.com/dashboard)

create table if not exists public.products (
  id text primary key,
  title text not null,
  price numeric not null,
  original_price numeric,
  rating numeric not null default 4.5,
  review_count integer not null default 0,
  image text not null,
  category text not null,
  unit text not null default 'each',
  prime boolean not null default true,
  description text not null,
  in_stock boolean not null default true,
  stock_quantity integer not null default 100,
  delivery text not null default 'FREE same-day delivery Tomorrow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_in_stock on public.products (in_stock);

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row
  execute function public.set_products_updated_at();

-- Allow public read for in-stock items (optional; API uses service role)
alter table public.products enable row level security;

create policy "Public read in-stock products"
  on public.products
  for select
  using (in_stock = true and stock_quantity > 0);

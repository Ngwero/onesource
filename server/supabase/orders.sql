-- Orders (run in Supabase SQL Editor)

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'placed'
    check (status in ('placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')),
  email text not null,
  full_name text not null,
  phone text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  district text default 'Kampala',
  notes text,
  subtotal numeric not null check (subtotal >= 0),
  delivery_fee numeric not null check (delivery_fee >= 0),
  total numeric not null check (total >= 0),
  currency text not null default 'UGX',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null,
  product_title text not null,
  product_image text,
  unit_price numeric not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total numeric not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Orders: read own" on public.orders;
create policy "Orders: read own"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "Order items: read via own order" on public.order_items;
create policy "Order items: read via own order"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

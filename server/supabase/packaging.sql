-- Run in Supabase Dashboard → SQL Editor
-- Packaging materials inventory + order packing fields for One Source fulfilment

create table if not exists public.packaging_materials (
  id text primary key,
  name text not null,
  type text not null default 'other'
    check (type in ('cooler_bag', 'paper_bag', 'crate', 'box', 'ice_pack', 'wrap', 'label', 'other')),
  sku text,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  reorder_level int not null default 10 check (reorder_level >= 0),
  unit_cost numeric not null default 0 check (unit_cost >= 0),
  unit text not null default 'each',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_packaging_materials_type on public.packaging_materials (type);
create index if not exists idx_packaging_materials_active on public.packaging_materials (active);

create or replace function public.set_packaging_materials_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists packaging_materials_updated_at on public.packaging_materials;
create trigger packaging_materials_updated_at
  before update on public.packaging_materials
  for each row
  execute function public.set_packaging_materials_updated_at();

alter table public.packaging_materials enable row level security;

-- Service role / admin API uses service key; allow authenticated read of active materials
drop policy if exists "Public read active packaging" on public.packaging_materials;
create policy "Public read active packaging"
  on public.packaging_materials
  for select
  using (active = true);

-- Order packing: add packed status + packaging metadata
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'orders'
  ) then
    alter table public.orders drop constraint if exists orders_status_check;
    alter table public.orders
      add constraint orders_status_check
      check (status in ('placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'));

    alter table public.orders
      add column if not exists packaging_material_id text references public.packaging_materials (id) on delete set null;
    alter table public.orders
      add column if not exists packaging_notes text;
    alter table public.orders
      add column if not exists packed_at timestamptz;

    create index if not exists idx_orders_packaging_material_id
      on public.orders (packaging_material_id);
  end if;
end $$;

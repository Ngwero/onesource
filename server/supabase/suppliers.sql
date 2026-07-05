-- Run in Supabase Dashboard → SQL Editor
-- Enables marketplace suppliers (sellers) on One Source

create table if not exists public.suppliers (
  id text primary key,
  business_name text not null,
  contact_name text,
  email text not null,
  phone text,
  location text,
  description text,
  logo text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'suspended', 'rejected')),
  commission_rate numeric not null default 15,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_status on public.suppliers (status);
create index if not exists idx_suppliers_email on public.suppliers (email);

create or replace function public.set_suppliers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at
  before update on public.suppliers
  for each row
  execute function public.set_suppliers_updated_at();

alter table public.suppliers enable row level security;

create policy "Public read approved suppliers"
  on public.suppliers
  for select
  using (status = 'approved');

-- Link products to suppliers (nullable — existing catalogue stays valid)
alter table public.products
  add column if not exists supplier_id text references public.suppliers (id) on delete set null;

create index if not exists idx_products_supplier_id on public.products (supplier_id);

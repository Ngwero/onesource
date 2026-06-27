-- Run in Supabase SQL Editor after schema.sql
-- Stores "Shop by Category" banner images (editable in admin)

create table if not exists public.categories (
  id text primary key,
  name text not null,
  icon text not null default '📦',
  image text,
  category_group text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_active on public.categories (active);

create or replace function public.set_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at
  before update on public.categories
  for each row
  execute function public.set_categories_updated_at();

alter table public.categories enable row level security;

create policy "Public read categories"
  on public.categories
  for select
  using (true);

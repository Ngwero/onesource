-- Run in Supabase Dashboard → SQL Editor.
-- Structured product information (ingredients, allergens, usage, warnings,
-- storage, specifications) and a publish flag so incomplete listings can be
-- hidden from the shop until their information is complete.

alter table public.products
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists published boolean not null default true;

create index if not exists idx_products_published on public.products (published);

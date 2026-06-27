-- Run if you already created categories table (adds soft-delete support)
alter table public.categories
  add column if not exists active boolean not null default true;

create index if not exists idx_categories_active on public.categories (active);

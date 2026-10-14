-- Run in Supabase Dashboard → SQL Editor (safe to re-run).
-- Speeds up the admin portal and catalogue listings now that `products` holds tens of
-- thousands of rows. The API works without this file; these make it fast under load.
--
-- Plain CREATE INDEX briefly blocks writes to `products` while each index builds
-- (seconds at ~40k rows). Run it when no bulk import is in progress, or run each
-- statement on its own as CREATE INDEX CONCURRENTLY.

create extension if not exists pg_trgm;

-- Admin list default sort (updated_at desc) and shop "newest" sort (created_at desc).
create index if not exists idx_products_updated_at on public.products (updated_at desc, id);
create index if not exists idx_products_created_at on public.products (created_at desc, id);

-- Shop / aisle prefix filters: id LIKE 'kitchen-%', 'cosmetics-skincare-%'.
create index if not exists idx_products_id_pattern on public.products (id text_pattern_ops);

-- Stock filters, low-stock lists, live-product filters.
create index if not exists idx_products_stock_quantity on public.products (stock_quantity, id);
create index if not exists idx_products_live on public.products (in_stock, stock_quantity);

-- Already in schema.sql / suppliers.sql; repeated so a partial setup still gets them.
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_supplier_id on public.products (supplier_id);

-- Substring search (ILIKE '%term%') on title and SKU.
create index if not exists idx_products_title_trgm on public.products using gin (title gin_trgm_ops);
create index if not exists idx_products_id_trgm on public.products using gin (id gin_trgm_ops);

-- One-statement inventory/category totals for the admin dashboard
-- (GET /api/admin/stats calls this when present, otherwise scans in small pages).
create or replace function public.admin_product_stats()
returns jsonb
language sql
stable
set search_path = public
as $$
  with p as (
    select
      coalesce(nullif(category, ''), 'uncategorized') as category,
      coalesce(stock_quantity, 0) as qty,
      (in_stock and coalesce(stock_quantity, 0) > 0) as live,
      coalesce(price, 0) as price
    from public.products
  ),
  cats as (
    select category, count(*) as n from p group by category
  )
  select jsonb_build_object(
    'total', (select count(*) from p),
    'live', (select count(*) from p where live),
    'out', (select count(*) from p where not live),
    'low', (select count(*) from p where qty > 0 and qty <= 10),
    'healthy', (select count(*) from p where live and qty > 10),
    'units', (select coalesce(sum(qty), 0) from p),
    'stock_value', (select coalesce(sum(price * qty), 0) from p),
    'by_category', (select coalesce(jsonb_object_agg(category, n), '{}'::jsonb) from cats)
  );
$$;

revoke all on function public.admin_product_stats() from public, anon, authenticated;
grant execute on function public.admin_product_stats() to service_role;

analyze public.products;

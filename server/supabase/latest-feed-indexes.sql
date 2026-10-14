-- Run in Supabase Dashboard → SQL Editor (safe to re-run).
-- Speeds up the Kitchen / Cosmetics "latest products" feeds and other shopper listings
-- (GET /api/products?shop=…&sort=newest). The API works without these.
--
-- CREATE INDEX CONCURRENTLY can't run inside a transaction block. If the SQL editor
-- complains, run each statement on its own (select it, then Run).

-- Shopper listings only ever show live products, newest first: walk this index in order
-- instead of sorting every live row for each page.
create index concurrently if not exists idx_products_live_newest
  on public.products (created_at desc, id)
  where published = true and in_stock = true and stock_quantity > 0;

-- Shop / aisle prefix filters: id LIKE 'kitchen-%', 'cosmetics-skincare-%'
-- (also in admin-performance.sql; repeated so this file stands alone).
create index concurrently if not exists idx_products_id_pattern
  on public.products (id text_pattern_ops);

analyze public.products;

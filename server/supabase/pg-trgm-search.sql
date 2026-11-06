-- Optional owner-paste (Supabase SQL Editor). Safe to re-run.
-- Typo-tolerant title search helper for GET /api/products?q=…
-- Skip entirely if the pg_trgm extension is unavailable on your plan.
-- Do not use CREATE INDEX CONCURRENTLY in this file.
--
-- The Node catalogueSearchIndex already applies synonym + single-edit typo
-- tolerance in application memory; this index only helps SQL fallbacks.

create extension if not exists pg_trgm;

create index if not exists idx_products_live_title_trgm
  on public.products using gin (title gin_trgm_ops)
  where in_stock = true and stock_quantity > 0;

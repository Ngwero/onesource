-- Optional owner-paste (Supabase SQL Editor). Safe to re-run.
-- Atomically reserve / release product stock in one transaction so two
-- checkouts cannot both buy the last unit.
--
-- The API already does an application-level reservation
-- (`stock_quantity = current` optimistic update) without this function.
-- Paste this if you want the reservation to run as a single SQL transaction.
--
-- Do not use CREATE INDEX CONCURRENTLY in this file.

create or replace function public.reserve_product_stock(p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  rec record;
  reserved jsonb := '[]'::jsonb;
  new_qty integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  for rec in
    select
      coalesce(item->>'product_id', item->>'productId') as id,
      (item->>'quantity')::integer as qty
    from jsonb_array_elements(p_items) as item
  loop
    if rec.id is null or rec.id = '' or rec.qty is null or rec.qty < 1 then
      raise exception 'invalid_quantity:%', coalesce(rec.id, '?') using errcode = 'P0001';
    end if;

    update public.products
    set
      stock_quantity = stock_quantity - rec.qty,
      in_stock = (stock_quantity - rec.qty) > 0,
      updated_at = now()
    where id = rec.id
      and stock_quantity >= rec.qty
    returning stock_quantity into new_qty;

    if not found then
      raise exception 'insufficient_stock:%', rec.id using errcode = 'P0001';
    end if;

    reserved := reserved || jsonb_build_array(
      jsonb_build_object(
        'product_id', rec.id,
        'quantity', rec.qty,
        'remaining', new_qty,
        'ok', true
      )
    );
  end loop;

  return jsonb_build_object('ok', true, 'reserved', reserved);
end;
$$;

create or replace function public.release_product_stock(p_items jsonb)
returns void
language plpgsql
as $$
declare
  rec record;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return;
  end if;

  for rec in
    select
      coalesce(item->>'product_id', item->>'productId') as id,
      (item->>'quantity')::integer as qty
    from jsonb_array_elements(p_items) as item
  loop
    if rec.id is null or rec.id = '' or rec.qty is null or rec.qty < 1 then
      continue;
    end if;

    update public.products
    set
      stock_quantity = stock_quantity + rec.qty,
      in_stock = true,
      updated_at = now()
    where id = rec.id;
  end loop;
end;
$$;

revoke all on function public.reserve_product_stock(jsonb) from public;
revoke all on function public.release_product_stock(jsonb) from public;
grant execute on function public.reserve_product_stock(jsonb) to service_role;
grant execute on function public.release_product_stock(jsonb) to service_role;

-- Optional: title search for GET /api/products?q=… (skip if pg_trgm is unavailable).
-- create extension if not exists pg_trgm;
-- create index if not exists idx_products_live_title_trgm
--   on public.products using gin (title gin_trgm_ops)
--   where in_stock = true and stock_quantity > 0;

-- Optional owner-paste (Supabase SQL Editor). Safe to re-run.
-- Product reviews linked to completed (delivered) orders (verified purchase).
-- Moderation flag + cached aggregates live on public.products (rating, review_count).
-- Do not use CREATE INDEX CONCURRENTLY in this file.
-- Seed nothing fake — only real customer reviews.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null check (char_length(body) between 1 and 4000),
  verified_purchase boolean not null default true,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index if not exists product_reviews_product_id_idx
  on public.product_reviews (product_id, created_at desc);

create index if not exists product_reviews_moderation_idx
  on public.product_reviews (moderation_status);

alter table public.product_reviews enable row level security;

drop policy if exists "Reviews: read approved" on public.product_reviews;
create policy "Reviews: read approved"
  on public.product_reviews for select
  using (moderation_status = 'approved');

-- API uses the service role; shoppers never write directly via anon key.
drop policy if exists "Reviews: insert own" on public.product_reviews;

-- Refresh cached rating / review_count from approved reviews only.
create or replace function public.refresh_product_rating(p_product_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_rating numeric;
  cnt integer;
begin
  select coalesce(avg(rating), 0), count(*)
    into avg_rating, cnt
  from public.product_reviews
  where product_id = p_product_id
    and moderation_status = 'approved';

  update public.products
  set
    rating = case when cnt > 0 then round(avg_rating::numeric, 1) else rating end,
    review_count = cnt,
    details = coalesce(details, '{}'::jsonb) ||
      case when cnt > 0
        then jsonb_build_object('ratingSource', 'onesource')
        else coalesce(details, '{}'::jsonb) - 'ratingSource'
      end,
    updated_at = now()
  where id = p_product_id;
end;
$$;

revoke all on function public.refresh_product_rating(text) from public;
grant execute on function public.refresh_product_rating(text) to service_role;

create or replace function public.product_reviews_refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_rating(old.product_id);
    return old;
  end if;
  perform public.refresh_product_rating(new.product_id);
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform public.refresh_product_rating(old.product_id);
  end if;
  return new;
end;
$$;

drop trigger if exists product_reviews_refresh_rating_trg on public.product_reviews;
create trigger product_reviews_refresh_rating_trg
  after insert or update of rating, moderation_status, product_id or delete
  on public.product_reviews
  for each row execute function public.product_reviews_refresh_rating();

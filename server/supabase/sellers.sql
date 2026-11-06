-- Third-party marketplace foundation (One Source = products.seller_id null)

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  bio text,
  commission_rate numeric(5,4) not null default 0.1000
    check (commission_rate >= 0 and commission_rate <= 1),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.seller_ratings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Nullable seller_id: null means sold by One Source. Do NOT backfill all products.
alter table public.products
  add column if not exists seller_id uuid references public.sellers (id) on delete set null;

create index if not exists sellers_slug_idx on public.sellers (slug);
create index if not exists seller_ratings_seller_id_idx on public.seller_ratings (seller_id);
create index if not exists products_seller_id_idx on public.products (seller_id);

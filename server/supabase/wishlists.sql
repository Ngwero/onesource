-- Wishlists with shareable public links (run in Supabase SQL Editor)

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Wishlist',
  share_token text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compat: rename share_slug → share_token if an older draft was pasted
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'wishlists' and column_name = 'share_slug'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'wishlists' and column_name = 'share_token'
  ) then
    alter table public.wishlists rename column share_slug to share_token;
  end if;
end $$;

alter table public.wishlists add column if not exists share_token text;
alter table public.wishlists add column if not exists is_public boolean not null default false;

create unique index if not exists wishlists_share_token_uidx
  on public.wishlists (share_token)
  where share_token is not null;

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create index if not exists wishlists_user_id_idx on public.wishlists (user_id);
create index if not exists wishlist_items_wishlist_id_idx on public.wishlist_items (wishlist_id);
create index if not exists wishlist_items_product_id_idx on public.wishlist_items (product_id);

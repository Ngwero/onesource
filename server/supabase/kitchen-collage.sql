-- Kitchen inspiration collage (IKEA-style hero on /kitchen)
-- Run in Supabase SQL Editor

create table if not exists public.kitchen_collage (
  id text primary key default 'kitchen-inspiration',
  intro_title text not null default '',
  intro_body text not null default '',
  image_1 text not null default '',
  image_2 text not null default '',
  image_3 text not null default '',
  image_4 text not null default '',
  image_5 text not null default '',
  alt_1 text not null default '',
  alt_2 text not null default '',
  alt_3 text not null default '',
  alt_4 text not null default '',
  alt_5 text not null default '',
  href_1 text not null default '',
  href_2 text not null default '',
  href_3 text not null default '',
  href_4 text not null default '',
  href_5 text not null default '',
  image_6 text not null default '',
  image_7 text not null default '',
  alt_6 text not null default '',
  alt_7 text not null default '',
  href_6 text not null default '',
  href_7 text not null default '',
  images_json jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- If the table already exists from an older 5-slot schema, add the new columns:
alter table public.kitchen_collage add column if not exists image_6 text not null default '';
alter table public.kitchen_collage add column if not exists image_7 text not null default '';
alter table public.kitchen_collage add column if not exists alt_6 text not null default '';
alter table public.kitchen_collage add column if not exists alt_7 text not null default '';
alter table public.kitchen_collage add column if not exists href_6 text not null default '';
alter table public.kitchen_collage add column if not exists href_7 text not null default '';
alter table public.kitchen_collage add column if not exists images_json jsonb not null default '[]'::jsonb;

create or replace function public.set_kitchen_collage_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kitchen_collage_updated_at on public.kitchen_collage;
create trigger kitchen_collage_updated_at
  before update on public.kitchen_collage
  for each row
  execute function public.set_kitchen_collage_updated_at();

alter table public.kitchen_collage enable row level security;

drop policy if exists "Public read active kitchen collage" on public.kitchen_collage;
create policy "Public read active kitchen collage"
  on public.kitchen_collage
  for select
  using (active = true);

-- Service role (admin API) bypasses RLS; anon can only read active rows.
grant select on public.kitchen_collage to anon, authenticated;
grant all on public.kitchen_collage to service_role;

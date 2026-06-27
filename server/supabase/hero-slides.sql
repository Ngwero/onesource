-- Run in Supabase SQL Editor (after schema.sql)

create table if not exists public.hero_slides (
  id text primary key,
  sort_order integer not null default 0,
  image text not null,
  badge text not null default '',
  title text not null,
  subtitle text not null default '',
  cta text not null default 'Shop now',
  cta_href text not null default '/categories',
  cta2 text,
  cta2_href text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hero_slides_active on public.hero_slides (active, sort_order);

create or replace function public.set_hero_slides_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hero_slides_updated_at on public.hero_slides;
create trigger hero_slides_updated_at
  before update on public.hero_slides
  for each row
  execute function public.set_hero_slides_updated_at();

alter table public.hero_slides enable row level security;

create policy "Public read active hero slides"
  on public.hero_slides
  for select
  using (active = true);

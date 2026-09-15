-- Optional: proper table for in-app notifications (Storage JSON works without this).
-- Run in Supabase SQL Editor if you prefer a table-backed store.

create table if not exists public.app_notifications (
  id text primary key,
  title text not null,
  body text not null default '',
  href text not null default '',
  image text,
  audience text not null default 'all',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_notifications_active_created
  on public.app_notifications (active, created_at desc);

create or replace function public.set_app_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_notifications_updated_at on public.app_notifications;
create trigger app_notifications_updated_at
  before update on public.app_notifications
  for each row
  execute function public.set_app_notifications_updated_at();

alter table public.app_notifications enable row level security;

create policy "Public read active app notifications"
  on public.app_notifications
  for select
  using (active = true);

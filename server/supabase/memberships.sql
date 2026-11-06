-- Membership tiers (free delivery threshold / member-only deals)

alter table public.profiles
  add column if not exists membership_tier text not null default 'standard';

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier text not null default 'member',
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists memberships_user_active_idx
  on public.memberships (user_id, active);

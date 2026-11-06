-- Per-user push tokens + in-app notification inbox.
-- FCM/APNs send is optional: when FCM_SERVER_KEY / APNS_* unset, records stay in inbox.

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  token text not null,
  opt_in boolean not null default true,
  topics text[] not null default array['order_status']::text[],
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_user_push_tokens_user on public.user_push_tokens (user_id);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null default 'general',
  title text not null,
  body text not null default '',
  href text not null default '',
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);
create index if not exists idx_user_notifications_unread
  on public.user_notifications (user_id)
  where read_at is null;

alter table public.user_push_tokens enable row level security;
alter table public.user_notifications enable row level security;

-- Topics used by the API:
--   order_status | back_in_stock | price_drop | subscription_reminder | support

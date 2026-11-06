-- Recurring reorder schedules (no payment charge retries).
-- Scheduler: node server/scripts/run-subscription-orders.js
--   or POST /api/internal/run-subscription-ticks with INTERNAL_CRON_SECRET

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  quantity integer not null default 1 check (quantity >= 1),
  interval_days integer not null default 14 check (interval_days >= 1),
  next_run timestamptz not null,
  last_reminded_at timestamptz,
  source_order_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_due_idx
  on public.subscriptions (active, next_run);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

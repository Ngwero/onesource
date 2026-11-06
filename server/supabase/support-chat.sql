-- Order-linked support chat threads

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid,
  subject text not null default 'Order help',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists support_threads_user_order_open_uidx
  on public.support_threads (user_id, order_id)
  where order_id is not null and status = 'open';

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete cascade,
  sender_user_id uuid,
  sender_role text not null check (sender_role in ('customer', 'support', 'shopper', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_threads_user_id_idx on public.support_threads (user_id);
create index if not exists support_threads_order_id_idx on public.support_threads (order_id);
create index if not exists support_messages_thread_id_idx on public.support_messages (thread_id);

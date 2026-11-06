-- Returns workflow + photo paths. No payment refund movement.

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  order_id uuid not null,
  order_item_id uuid,
  product_id text,
  reason text not null default '',
  photo_path text,
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'received')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compat: if an older `returns` table exists without return_requests, leave it;
-- API uses return_requests only.

create index if not exists return_requests_user_id_idx on public.return_requests (user_id);
create index if not exists return_requests_order_id_idx on public.return_requests (order_id);
create index if not exists return_requests_status_idx on public.return_requests (status);

-- Photos: upload to storage bucket folder `returns/` via processAndStoreImage.

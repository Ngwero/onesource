-- Optional owner-paste (Supabase SQL Editor). Safe to re-run.
-- Thin product Q&A foundation: shopper questions tied to product_id.
-- No scraped content. Do not use CREATE INDEX CONCURRENTLY.

create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  question text not null check (char_length(question) between 5 and 1000),
  answer text check (answer is null or char_length(answer) between 1 and 4000),
  answered_at timestamptz,
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_questions_product_id_idx
  on public.product_questions (product_id, created_at desc);

alter table public.product_questions enable row level security;

drop policy if exists "Questions: read approved" on public.product_questions;
create policy "Questions: read approved"
  on public.product_questions for select
  using (moderation_status = 'approved');

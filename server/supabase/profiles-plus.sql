-- One Source Plus — free enrolled flag (no paid billing).
-- Free delivery threshold remains UGX 100,000 for everyone; Plus is for future member-only deals.

alter table public.profiles
  add column if not exists onesource_plus boolean not null default false;

alter table public.profiles
  add column if not exists onesource_plus_enrolled_at timestamptz;

comment on column public.profiles.onesource_plus is
  'Free One Source Plus enrolment flag. No subscription billing.';

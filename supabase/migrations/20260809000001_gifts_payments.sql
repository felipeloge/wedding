-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- TABLE: gifts
-- ─────────────────────────────────────────────
create table if not exists public.gifts (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  price_cents integer     not null check (price_cents > 0),
  image_url   text,
  is_available boolean    not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gifts_updated_at
  before update on public.gifts
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────
-- TABLE: payments
-- ─────────────────────────────────────────────
create table if not exists public.payments (
  id                       uuid        primary key default gen_random_uuid(),
  gift_id                  uuid        references public.gifts(id) on delete set null,
  stripe_session_id        text        unique not null,
  stripe_payment_intent_id text,
  buyer_name               text,
  buyer_email              text,
  buyer_message            text,
  amount_cents             integer     not null,
  currency                 text        not null default 'brl',
  payment_method           text,
  installments             integer     not null default 1,
  status                   text        not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'refunded')),
  paid_at                  timestamptz,
  created_at               timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index if not exists gifts_is_available_idx      on public.gifts(is_available);
create index if not exists payments_gift_id_idx        on public.payments(gift_id);
create index if not exists payments_session_id_idx     on public.payments(stripe_session_id);
create index if not exists payments_status_idx         on public.payments(status);
create index if not exists payments_created_at_idx     on public.payments(created_at desc);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.gifts    enable row level security;
alter table public.payments enable row level security;

-- gifts: anon can read available gifts (public website)
create policy "gifts_anon_read_available"
  on public.gifts for select to anon
  using (is_available = true);

-- gifts: authenticated (dashboard) can do everything
create policy "gifts_auth_all"
  on public.gifts for all to authenticated
  using (true) with check (true);

-- payments: authenticated (dashboard) can read all
create policy "payments_auth_read"
  on public.payments for select to authenticated
  using (true);

-- payments: authenticated can insert (for webhook via service role which bypasses RLS anyway)
create policy "payments_auth_insert"
  on public.payments for insert to authenticated
  with check (true);

-- ─────────────────────────────────────────────
-- STORAGE: gift-images bucket
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('gift-images', 'gift-images', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload gift images
create policy "gift_images_auth_upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'gift-images');

-- Allow authenticated users to update/delete their uploads
create policy "gift_images_auth_manage"
  on storage.objects for all to authenticated
  using (bucket_id = 'gift-images');

-- Public read access (images are served publicly)
create policy "gift_images_public_read"
  on storage.objects for select to anon
  using (bucket_id = 'gift-images');

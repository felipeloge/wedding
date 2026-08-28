-- ─────────────────────────────────────────────
-- TABLE: guests
-- ─────────────────────────────────────────────
create table if not exists public.guests (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  phone               text        not null,
  observations        text,
  rsvp_status         text        not null default 'pending'
    check (rsvp_status in ('pending', 'confirmed', 'declined')),
  rsvp_confirmed_at   timestamptz,
  short_url_code      text        unique not null
    default substring(gen_random_uuid()::text, 1, 8),
  feed_access_granted boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- reuse handle_updated_at from migration 001
create trigger guests_updated_at
  before update on public.guests
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────
-- TABLE: guest_companions
-- ─────────────────────────────────────────────
create table if not exists public.guest_companions (
  id         uuid        primary key default gen_random_uuid(),
  guest_id   uuid        not null references public.guests(id) on delete cascade,
  name       text        not null,
  phone      text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- TABLE: whatsapp_messages
-- ─────────────────────────────────────────────
create table if not exists public.whatsapp_messages (
  id            uuid        primary key default gen_random_uuid(),
  guest_id      uuid        references public.guests(id) on delete set null,
  template_name text        not null,
  status        text        not null default 'sent'
    check (status in ('sent', 'delivered', 'read', 'failed')),
  sent_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index if not exists guests_rsvp_status_idx     on public.guests(rsvp_status);
create index if not exists guests_short_url_code_idx  on public.guests(short_url_code);
create index if not exists guests_created_at_idx      on public.guests(created_at desc);
create index if not exists companions_guest_id_idx    on public.guest_companions(guest_id);
create index if not exists whatsapp_guest_id_idx      on public.whatsapp_messages(guest_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.guests            enable row level security;
alter table public.guest_companions  enable row level security;
alter table public.whatsapp_messages enable row level security;

-- guests: authenticated (dashboard) full access
create policy "guests_auth_all"
  on public.guests for all to authenticated
  using (true) with check (true);

-- guests: anon can read (confirmation page reads by short_url_code)
create policy "guests_anon_read"
  on public.guests for select to anon
  using (true);

-- guest_companions: authenticated full access
create policy "guest_companions_auth_all"
  on public.guest_companions for all to authenticated
  using (true) with check (true);

-- guest_companions: anon can read (companion names shown on confirmation page)
create policy "guest_companions_anon_read"
  on public.guest_companions for select to anon
  using (true);

-- whatsapp_messages: authenticated only
create policy "whatsapp_messages_auth_all"
  on public.whatsapp_messages for all to authenticated
  using (true) with check (true);

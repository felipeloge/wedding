-- ─────────────────────────────────────────────
-- TABLE: pix_messages
-- ─────────────────────────────────────────────
create table if not exists public.pix_messages (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  message    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists pix_messages_created_at_idx on public.pix_messages(created_at desc);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.pix_messages enable row level security;

-- anon (public website) can submit messages
create policy "pix_messages_anon_insert"
  on public.pix_messages for insert to anon
  with check (true);

-- authenticated (dashboard) can read all messages
create policy "pix_messages_auth_read"
  on public.pix_messages for select to authenticated
  using (true);

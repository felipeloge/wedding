alter table public.guest_companions
  add column rsvp_status text not null default 'pending'
    check (rsvp_status in ('pending', 'confirmed', 'declined'));

create index if not exists companions_rsvp_status_idx on public.guest_companions(rsvp_status);

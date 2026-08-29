-- Allow anon to see purchased gifts so they remain visible on the gifts page
drop policy if exists "gifts_anon_read_available" on public.gifts;

create policy "gifts_anon_read_all"
  on public.gifts for select to anon
  using (true);

-- Rename to provider-agnostic names so future payment provider changes need no migration
alter table public.payments rename column pagarme_order_id  to provider_session_id;
alter table public.payments rename column pagarme_charge_id to provider_payment_id;

alter table public.payments
  rename constraint payments_pagarme_order_id_key to payments_provider_session_id_key;

drop  index if exists public.payments_order_id_idx;
create index if not exists payments_provider_session_id_idx on public.payments(provider_session_id);

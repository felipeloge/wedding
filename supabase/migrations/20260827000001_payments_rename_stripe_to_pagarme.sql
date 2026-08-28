-- Rename Stripe-specific columns to provider-agnostic names
alter table public.payments rename column stripe_session_id        to pagarme_order_id;
alter table public.payments rename column stripe_payment_intent_id to pagarme_charge_id;

-- Rename the unique constraint (PostgreSQL keeps the old name after column rename)
alter table public.payments
  rename constraint payments_stripe_session_id_key to payments_pagarme_order_id_key;

-- Recreate the named index under the new column name
drop  index if exists public.payments_session_id_idx;
create index if not exists payments_order_id_idx on public.payments(pagarme_order_id);

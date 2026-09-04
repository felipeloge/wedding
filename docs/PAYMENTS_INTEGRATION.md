# Payment Integration — Mercado Pago Checkout Pro

This document describes the payment integration for the site (`apps/web`),
used in the gift registry (`/presentes` → `/checkout/[id]`), including the
technical decisions, gotchas found along the way, and how to test/debug it.

## Why Mercado Pago

Providers evaluated in this order, each discarded for a specific reason:

1. **Stripe** — doesn't support card installments (`payment_method_options.card.installments`)
   outside of Mexico (meses sin intereses). Native Brazilian installment
   payments simply don't exist in Stripe Checkout.
2. **PagarMe (now Stone)** — requires a CNPJ (business registration) to create
   an account; their developer site (`developer.pagbank.com.br` /
   `dev.pagbank.uol.com.br`) was returning 404 on several pages at the time of testing.
3. **InfinitePay / SumUp** — no proper hosted checkout API suitable for
   e-commerce (focused on card readers / one-off payment links).
4. **Asaas** — worked technically (CPF-only account, sandbox worked fine),
   but support couldn't resolve the production credentials issue in time.
5. **Mercado Pago Checkout Pro** — ✅ chosen. Personal (CPF) account
   supported, well-documented API, native installments, PIX, hosted redirect checkout.

## Architecture

```
apps/web/src/pages/api/create-checkout-session.ts   → creates the MP Preference, returns the checkout URL
apps/web/src/pages/api/payment-webhook.ts           → receives MP notifications, writes to `payments`
apps/web/src/components/CheckoutForm.tsx            → form (gift summary + optional message)
```

Mercado Pago Checkout Pro is a **hosted, redirect-based checkout**: the
backend creates a *Preference* (`POST /checkout/preferences`), the buyer is
redirected to Mercado Pago's domain (which collects name, email, CPF, and
card details itself), and afterwards returns to `back_urls.success` (`/obrigado`).

We do not collect the buyer's name/CPF on our own form — Mercado Pago's own
payment page handles that collection.

## Database

The `payments` table uses **generic, provider-agnostic column names**:

- `provider_session_id` — the Mercado Pago Preference id
- `provider_payment_id` — the Mercado Pago Payment id

These names come from an earlier migration that renamed Stripe/PagarMe-specific
columns to provider-agnostic ones
(`supabase/migrations/20260827000002_payments_rename_to_generic_provider.sql`).
**If the payment provider changes again, no new migration should be
necessary** — just map the new provider's fields onto these generic columns.

## Environment variables

Defined in `apps/web/.env` (local) and must be replicated in **Cloudflare
Pages** environment variables (Settings → Environment variables) for production:

```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...
```

### Where to find the Access Token

**Mercado Pago → Suas integrações → [your application] → Credenciais de
produção → Access Token.**

⚠️ **Common gotcha:** don't confuse it with the **Client ID** (shown on the
same screen). The Client ID is short (e.g. `3663091659`), while the Access
Token is a long string in the format
`APP_USR-{app_id}-{date}-{hash}-{user_id}` (70+ characters). Using the Client
ID instead of the Access Token causes this error:

```
"At least one policy returned UNAUTHORIZED."
```

### Where to find the Webhook Secret

**Mercado Pago → Developers → Webhooks** → configure the notification URL
(`https://YOUR_DOMAIN/api/payment-webhook`) and subscribe to the **Payments**
event. The signature secret shown there is the `MERCADOPAGO_WEBHOOK_SECRET`.

## Payment creation flow (`create-checkout-session.ts`)

1. Receives `giftId` and an optional `buyerMessage` from the form.
2. Fetches the gift from Supabase and checks `is_available = true`.
3. Creates a Preference via `POST https://api.mercadopago.com/checkout/preferences` with:
   - `items`: gift name, description, price, and image.
   - `back_urls` + `auto_return: "approved"`: redirects to `/obrigado` after an approved payment.
   - `payment_methods.installments: 12`: sets the installment cap on the preference (see Installments section below).
   - `notification_url`: points to `/api/payment-webhook`.
   - `external_reference`: the `giftId`, used to link the payment back to the gift in the webhook.
   - `metadata.buyer_message`: optional message for the couple.
4. Returns `init_point` (production) or `sandbox_init_point` (if the token starts with `TEST-`) as the redirect URL.

Mercado Pago errors (`errBody.message`) are forwarded to the client instead of
a generic message, to make debugging easier.

## Installments

Two settings need to be aligned — if they diverge, the **lower** one wins:

1. **On the Preference** (`payment_methods.installments: 12`, already set in the code).
2. **On the Mercado Pago account**: **Sua conta → Configurações → Meios de
   pagamento** (or **Cobrar → Configurações de pagamento**) — confirm
   installments are enabled and capped at the desired number.

Even with both set to 12, the number of installments actually offered to the
buyer also depends on:
- The **card brand/issuer** (some cards don't support long installment plans).
- The **minimum value per installment** required by Mercado Pago (very low
  installment amounts, e.g. below ~R$5–10, may not be offered).

## Webhook (`payment-webhook.ts`)

Mercado Pago sends a lightweight notification (`{ type: "payment", data: { id } }`)
and the handler fetches the full details:

1. Validates `type === "payment"` — other types (`merchant_order`, etc.) are
   acknowledged with `200 OK` and ignored.
2. Verifies the `x-signature` / `x-request-id` headers via HMAC-SHA256, using
   `MERCADOPAGO_WEBHOOK_SECRET` (see `verifySignature`). If those headers are
   missing (e.g. manual local testing), verification is skipped — **don't
   rely on this in production**, it's only a fallback for tests.
3. Fetches the full payment via `GET /v1/payments/{id}`.
4. If `status === "approved"`, inserts into `payments`:
   - `gift_id` from `external_reference` (falling back to `metadata.gift_id`).
   - `buyer_name`/`buyer_email` from `payment.payer`.
   - `buyer_message` from `metadata.buyer_message`.
   - `payment_method` from `payment_type_id` (e.g. `credit_card`, `debit_card`, `pix`).
   - `installments` from `payment.installments`.
5. Marks the gift as unavailable (`gifts.is_available = false`).

## Testing locally

Mercado Pago needs a public URL to send webhook notifications. Use a tunnel
(Cloudflare Tunnel or ngrok) pointing to the local Astro dev server port
(default `4321`):

```bash
cloudflared tunnel --url http://localhost:4321
# or
ngrok http 4321
```

Set the generated temporary URL (`https://xxxxx.trycloudflare.com/api/payment-webhook`)
in **Developers → Webhooks** while testing, and switch back to the production
URL afterwards.

## Deploy checklist

- [ ] `MERCADOPAGO_ACCESS_TOKEN` (production Access Token, not the Client ID) set in Cloudflare Pages.
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` set in Cloudflare Pages.
- [ ] Webhook configured in the Mercado Pago dashboard pointing to the production domain, subscribed to the **Payments** event.
- [ ] Installments enabled and capped as desired in **Configurações → Meios de pagamento**.
- [ ] Supabase migrations applied (`payments.provider_session_id` / `provider_payment_id` are already generic, no additional migration needed).

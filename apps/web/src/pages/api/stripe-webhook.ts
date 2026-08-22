import type { APIRoute } from 'astro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Assinatura ausente', { status: 400 })
  }

  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      import.meta.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[stripe-webhook] Falha ao verificar assinatura:', message)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  const isPaid =
    event.type === 'checkout.session.async_payment_succeeded' ||
    (event.type === 'checkout.session.completed' &&
      (event.data.object as Stripe.Checkout.Session).payment_status === 'paid')

  if (isPaid) {
    const session = event.data.object as Stripe.Checkout.Session

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const paymentMethod = Array.isArray(session.payment_method_types)
      ? session.payment_method_types[0] ?? null
      : null

    const { error: insertError } = await supabase.from('payments').insert({
      gift_id: session.metadata?.gift_id ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      buyer_name: session.customer_details?.name ?? null,
      buyer_email: session.customer_details?.email ?? null,
      buyer_message: session.metadata?.buyer_message ?? null,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? 'brl',
      payment_method: paymentMethod,
      status: 'completed',
      paid_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[stripe-webhook] Erro ao salvar pagamento:', insertError)
    }

    // Mark gift as unavailable
    if (session.metadata?.gift_id) {
      const { error: updateError } = await supabase
        .from('gifts')
        .update({ is_available: false })
        .eq('id', session.metadata.gift_id)

      if (updateError) {
        console.error('[stripe-webhook] Erro ao atualizar gift:', updateError)
      }
    }
  }

  return new Response('OK', { status: 200 })
}

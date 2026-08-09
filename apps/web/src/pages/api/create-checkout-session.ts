import type { APIRoute } from 'astro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const json = await request.json().catch(() => null)

  if (!json?.giftId) {
    return new Response(JSON.stringify({ error: 'giftId é obrigatório' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { giftId, buyerMessage } = json as { giftId: string; buyerMessage?: string }

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
  )

  const { data: gift, error: giftError } = await supabase
    .from('gifts')
    .select('*')
    .eq('id', giftId)
    .eq('is_available', true)
    .single()

  if (giftError || !gift) {
    return new Response(JSON.stringify({ error: 'Presente não encontrado ou indisponível' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)
  const origin = new URL(request.url).origin

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'pix'],
    line_items: [
      {
        price_data: {
          currency: 'brl',
          unit_amount: gift.price_cents,
          product_data: {
            name: gift.name,
            description: gift.description ?? undefined,
            images: gift.image_url ? [gift.image_url] : [],
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    locale: 'pt-BR',
    payment_method_options: {
      card: {
        installments: { enabled: true },
      },
    },
    success_url: `${origin}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/presentes`,
    metadata: {
      gift_id: gift.id,
      buyer_message: (buyerMessage ?? '').slice(0, 500),
    },
  })

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

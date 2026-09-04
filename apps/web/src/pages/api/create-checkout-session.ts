import type { APIRoute } from 'astro'
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

  const origin      = new URL(request.url).origin
  const accessToken = import.meta.env.MERCADOPAGO_ACCESS_TOKEN

  const preferenceBody = {
    items: [
      {
        title: gift.name,
        description: gift.description ?? undefined,
        quantity: 1,
        unit_price: gift.price_cents / 100,
        currency_id: 'BRL',
        picture_url: gift.image_url ?? undefined,
      },
    ],
    back_urls: {
      success: `${origin}/obrigado`,
      failure: `${origin}/presentes`,
      pending: `${origin}/obrigado`,
    },
    auto_return: 'approved',
    payment_methods: {
      installments: 12,
    },
    notification_url: `${origin}/api/payment-webhook`,
    external_reference: giftId,
    metadata: {
      gift_id: giftId,
      buyer_message: (buyerMessage ?? '').slice(0, 500),
    },
  }

  let mpRes: Response
  try {
    mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    })
  } catch (err) {
    console.error('[mercadopago] Erro de rede:', err)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de pagamento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!mpRes.ok) {
    const errBody = await mpRes.json().catch(() => ({}))
    console.error('[mercadopago] Erro ao criar preferência:', errBody)
    const description: string = errBody?.message ?? 'Erro ao criar sessão de pagamento'
    return new Response(JSON.stringify({ error: description }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const preference = await mpRes.json()

  // Test access tokens (TEST-...) must redirect to the sandbox checkout
  const isTest = String(accessToken).startsWith('TEST-')
  const paymentUrl: string | undefined = isTest
    ? preference.sandbox_init_point
    : preference.init_point

  if (!paymentUrl) {
    console.error('[mercadopago] init_point ausente na resposta:', preference)
    return new Response(JSON.stringify({ error: 'URL de pagamento não retornada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ url: paymentUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

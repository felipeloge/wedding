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

  const origin  = new URL(request.url).origin
  const apiKey  = import.meta.env.ASAAS_API_KEY
  const baseUrl = import.meta.env.ASAAS_SANDBOX === 'true'
    ? 'https://api-sandbox.asaas.com'
    : 'https://api.asaas.com'

  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    access_token: apiKey,
  }

  // Asaas requires a customer entity before creating a payment
  const customerRes = await fetch(`${baseUrl}/v3/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Convidado' }),
  })

  if (!customerRes.ok) {
    const err = await customerRes.json().catch(() => ({}))
    console.error('[asaas] Erro ao criar cliente:', err)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de pagamento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id: customerId } = await customerRes.json() as { id: string }

  // Due date 7 days from now gives guests enough time to complete the payment
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const description = buyerMessage
    ? `${gift.name} | Mensagem: ${buyerMessage.slice(0, 400)}`
    : gift.name

  const paymentRes = await fetch(`${baseUrl}/v3/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer: customerId,
      billingType: 'UNDEFINED',
      value: gift.price_cents / 100,
      dueDate,
      description,
      externalReference: giftId,
      callback: {
        successUrl: `${origin}/obrigado`,
        autoRedirect: true,
      },
    }),
  })

  if (!paymentRes.ok) {
    const err = await paymentRes.json().catch(() => ({}))
    console.error('[asaas] Erro ao criar pagamento:', err)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de pagamento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const payment = await paymentRes.json() as { invoiceUrl: string }

  if (!payment.invoiceUrl) {
    console.error('[asaas] invoiceUrl ausente:', payment)
    return new Response(JSON.stringify({ error: 'URL de pagamento não retornada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ url: payment.invoiceUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

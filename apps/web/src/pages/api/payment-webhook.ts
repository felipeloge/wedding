import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  // Asaas sends the configured webhook token in this header
  const token = request.headers.get('asaas-access-token')
  if (token !== import.meta.env.ASAAS_WEBHOOK_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  type AsaasPayment = {
    id: string
    status: string
    billingType: string
    value: number
    installmentCount?: number | null
    externalReference?: string | null
    description?: string | null
    customer?: string
    creditCard?: { creditCardBrand?: string }
  }

  type AsaasCustomer = { name?: string; email?: string }
  type AsaasEvent = { event: string; payment: AsaasPayment }

  let body: AsaasEvent
  try {
    body = (await request.json()) as AsaasEvent
  } catch {
    return new Response('Body inválido', { status: 400 })
  }

  const isPaid = body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED'

  if (isPaid) {
    const p = body.payment
    const giftId = p.externalReference ?? null

    // Fetch customer to get the guest's name and email
    let buyerName: string | null = null
    let buyerEmail: string | null = null
    if (p.customer) {
      const baseUrl = import.meta.env.ASAAS_SANDBOX === 'true'
        ? 'https://api-sandbox.asaas.com'
        : 'https://api.asaas.com'
      const customerRes = await fetch(`${baseUrl}/v3/customers/${p.customer}`, {
        headers: {
          access_token: import.meta.env.ASAAS_API_KEY,
          'user-agent': 'RaissaEFelipe2026/1.0',
        },
      }).catch(() => null)
      if (customerRes?.ok) {
        const c = (await customerRes.json()) as AsaasCustomer
        buyerName  = c.name  ?? null
        buyerEmail = c.email ?? null
      }
    }

    // Extract optional buyer message from description ("Gift Name - Mensagem: ...")
    const buyerMessage = p.description?.includes('- Mensagem:')
      ? p.description.split('- Mensagem:')[1]?.trim() ?? null
      : null

    const paymentMethod = p.billingType === 'CREDIT_CARD'
      ? `credit_card${p.creditCard?.creditCardBrand ? `_${p.creditCard.creditCardBrand.toLowerCase()}` : ''}`
      : p.billingType.toLowerCase()

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const { error: insertError } = await supabase.from('payments').insert({
      gift_id:             giftId,
      provider_session_id: p.id,
      provider_payment_id: p.id,
      buyer_name:          buyerName,
      buyer_email:         buyerEmail,
      buyer_message:       buyerMessage,
      amount_cents:        Math.round(p.value * 100),
      currency:            'brl',
      payment_method:      paymentMethod,
      installments:        p.installmentCount ?? 1,
      status:              'completed',
      paid_at:             new Date().toISOString(),
    })

    if (insertError) {
      console.error('[payment-webhook] Erro ao salvar pagamento:', insertError)
    }

    if (giftId) {
      const { error: updateError } = await supabase
        .from('gifts')
        .update({ is_available: false })
        .eq('id', giftId)

      if (updateError) {
        console.error('[payment-webhook] Erro ao atualizar gift:', updateError)
      }
    }
  }

  return new Response('OK', { status: 200 })
}

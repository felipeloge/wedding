import type { APIRoute } from 'astro'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const prerender = false

function verifySignature(
  secret: string,
  xSignature: string,
  xRequestId: string,
  dataId: string,
): boolean {
  const parts: Record<string, string> = {}
  for (const part of xSignature.split(',')) {
    const [k, v] = part.split('=', 2)
    if (k && v) parts[k.trim()] = v.trim()
  }
  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const message = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(message).digest('hex')
  const expBuf = Buffer.from(expected, 'utf8')
  const v1Buf  = Buffer.from(v1,       'utf8')
  return expBuf.length === v1Buf.length && timingSafeEqual(expBuf, v1Buf)
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody    = await request.text()
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  type Notification = { type?: string; data?: { id?: string | number } }
  let notification: Notification
  try {
    notification = JSON.parse(rawBody) as Notification
  } catch {
    return new Response('Body inválido', { status: 400 })
  }

  if (notification.type !== 'payment' || !notification.data?.id) {
    // Acknowledge other event types (merchant_order, etc.) without processing
    return new Response('OK', { status: 200 })
  }

  const paymentId = String(notification.data.id)

  if (xSignature && xRequestId) {
    const webhookSecret = import.meta.env.MERCADOPAGO_WEBHOOK_SECRET
    if (!verifySignature(webhookSecret, xSignature, xRequestId, paymentId)) {
      console.error('[payment-webhook] Assinatura inválida')
      return new Response('Assinatura inválida', { status: 400 })
    }
  }

  type MPPayment = {
    id: number
    status: string
    external_reference?: string
    preference_id?: string
    transaction_amount: number
    currency_id: string
    payment_type_id: string
    installments: number
    metadata?: Record<string, string>
    payer?: { email?: string; first_name?: string; last_name?: string }
  }

  let payment: MPPayment
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${import.meta.env.MERCADOPAGO_ACCESS_TOKEN}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    payment = (await res.json()) as MPPayment
  } catch (err) {
    console.error('[payment-webhook] Erro ao buscar pagamento:', err)
    return new Response('Erro ao buscar pagamento', { status: 500 })
  }

  if (payment.status === 'approved') {
    const giftId = payment.external_reference ?? payment.metadata?.gift_id ?? null

    const buyerName =
      [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(' ') || null

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const { error: insertError } = await supabase.from('payments').insert({
      gift_id:             giftId,
      provider_session_id: payment.preference_id ?? `pref_unknown_${payment.id}`,
      provider_payment_id: String(payment.id),
      buyer_name:          buyerName,
      buyer_email:         payment.payer?.email ?? null,
      buyer_message:       payment.metadata?.buyer_message ?? null,
      amount_cents:        Math.round(payment.transaction_amount * 100),
      currency:            (payment.currency_id ?? 'BRL').toLowerCase(),
      payment_method:      payment.payment_type_id,
      installments:        payment.installments ?? 1,
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

import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const json = await request.json().catch(() => null)
  const code = typeof json?.code === 'string' ? json.code.trim() : null
  const confirmedCompanionIds: string[] = Array.isArray(json?.confirmedCompanionIds)
    ? (json.confirmedCompanionIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : []

  if (!code) {
    return new Response(JSON.stringify({ error: 'Código inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Use service role to allow update without auth
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: guest, error: findError } = await supabase
    .from('guests')
    .select('id, rsvp_status')
    .eq('short_url_code', code)
    .single()

  if (findError || !guest) {
    return new Response(JSON.stringify({ error: 'Convidado não encontrado.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (guest.rsvp_status === 'confirmed') {
    return new Response(JSON.stringify({ success: true, alreadyConfirmed: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error: updateError } = await supabase
    .from('guests')
    .update({ rsvp_status: 'confirmed', rsvp_confirmed_at: new Date().toISOString() })
    .eq('id', guest.id)

  if (updateError) {
    return new Response(JSON.stringify({ error: 'Erro ao confirmar presença. Tente novamente.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: allCompanions } = await supabase
    .from('guest_companions')
    .select('id')
    .eq('guest_id', guest.id)

  if (allCompanions && allCompanions.length > 0) {
    const confirmedSet = new Set(confirmedCompanionIds)
    const toConfirm = allCompanions.map((c) => c.id).filter((id) => confirmedSet.has(id))
    const toDecline = allCompanions.map((c) => c.id).filter((id) => !confirmedSet.has(id))

    await Promise.all([
      toConfirm.length > 0
        ? supabase.from('guest_companions').update({ rsvp_status: 'confirmed' }).in('id', toConfirm)
        : Promise.resolve(),
      toDecline.length > 0
        ? supabase.from('guest_companions').update({ rsvp_status: 'declined' }).in('id', toDecline)
        : Promise.resolve(),
    ])
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

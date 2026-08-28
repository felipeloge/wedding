import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: require a valid Supabase JWT (dashboard user)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const json = await req.json().catch(() => null)
    const guestId = typeof json?.guestId === 'string' ? json.guestId : null

    if (!guestId) {
      return new Response(JSON.stringify({ error: 'guestId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to read guest data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name, phone, short_url_code')
      .eq('id', guestId)
      .single()

    if (guestError || !guest) {
      return new Response(JSON.stringify({ error: 'Convidado não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build confirmation link
    const websiteUrl = Deno.env.get('WEDDING_WEBSITE_URL') ?? 'https://raissaefelipe2026.com.br'
    const confirmUrl = `${websiteUrl}/confirmar/${guest.short_url_code}`

    // Build message text
    const message =
      `Olá, ${guest.name}! 🌿\n\n` +
      `Raíssa e Felipe têm o prazer de convidá-lo(a) para o casamento deles em *28 de novembro de 2026*! 🤍\n\n` +
      `Para confirmar sua presença, acesse o link abaixo:\n${confirmUrl}\n\n` +
      `Aguardamos você com muito carinho! 💚`

    // Call Evolution API
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')
    const evolutionInstance = Deno.env.get('EVOLUTION_API_INSTANCE')

    if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
      return new Response(
        JSON.stringify({ error: 'Evolution API não configurada. Defina EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_API_INSTANCE nas variáveis de ambiente do Supabase.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const evolutionRes = await fetch(
      `${evolutionUrl}/message/sendText/${evolutionInstance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionKey,
        },
        body: JSON.stringify({
          number: guest.phone,
          text: message,
        }),
      },
    )

    const messageStatus = evolutionRes.ok ? 'sent' : 'failed'

    // Log message regardless of send result
    await supabase.from('whatsapp_messages').insert({
      guest_id: guest.id,
      template_name: 'rsvp_invite',
      status: messageStatus,
    })

    if (!evolutionRes.ok) {
      const body = await evolutionRes.text()
      console.error('Evolution API error:', evolutionRes.status, body)
      return new Response(
        JSON.stringify({ error: `Falha ao enviar mensagem (HTTP ${evolutionRes.status})` }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-whatsapp error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const json = await request.json().catch(() => null)
  const name    = typeof json?.name === 'string' ? json.name.trim() : ''
  const message = typeof json?.message === 'string' ? json.message.trim() : ''

  if (!name || !message) {
    return new Response(JSON.stringify({ error: 'Nome e mensagem são obrigatórios.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
  )

  const { error } = await supabase.from('pix_messages').insert({
    name: name.slice(0, 200),
    message: message.slice(0, 1000),
  })

  if (error) {
    return new Response(JSON.stringify({ error: 'Erro ao enviar mensagem. Tente novamente.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

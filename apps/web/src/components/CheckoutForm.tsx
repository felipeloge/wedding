import { useState } from 'react'
import type { Gift } from '@wedding/supabase'

interface Props {
  gift: Gift
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function CheckoutForm({ gift }: Props) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId: gift.id, buyerMessage: message }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao iniciar pagamento')
      }

      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Order summary */}
      <div className="border border-border bg-surface-lowest p-6">
        <p className="font-body text-xs uppercase tracking-widest text-text-muted mb-4">
          Resumo do presente
        </p>
        <div className="flex gap-4 items-start">
          {gift.image_url && (
            <div className="w-20 h-20 flex-shrink-0 border border-border overflow-hidden bg-surface-low">
              <img src={gift.image_url} alt={gift.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg text-text leading-snug">{gift.name}</h3>
            {gift.description && (
              <p className="font-body text-sm text-text-muted mt-1 line-clamp-2">{gift.description}</p>
            )}
            <p className="font-body text-xl text-gold font-medium mt-3">
              {formatBRL(gift.price_cents)}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block font-body text-sm font-medium text-text mb-2">
          Mensagem para os noivos{' '}
          <span className="text-text-muted font-normal">(opcional)</span>
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Deixe uma mensagem especial para Raíssa e Felipe…"
          className="w-full border border-border bg-white px-4 py-3 font-body text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:ring-0 outline-none transition-colors resize-none"
        />
        <p className="text-right font-body text-xs text-text-muted mt-1">
          {message.length}/500
        </p>
      </div>

      {error && (
        <p className="font-body text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">
          {error}
        </p>
      )}

      {/* CTA */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white font-body text-sm uppercase tracking-[0.15em] py-4 hover:bg-primary-dark transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Aguarde…' : 'Ir para o pagamento →'}
      </button>

      {/* Security notice */}
      <div className="flex items-center justify-center gap-2 text-text-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="font-body text-xs">Pagamento seguro e criptografado via Stripe</span>
      </div>
    </form>
  )
}

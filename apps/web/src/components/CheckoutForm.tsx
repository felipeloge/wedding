import { useState } from 'react'
import type { Gift } from '@wedding/supabase'
import styles from './CheckoutForm.module.scss'

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
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.summary}>
        <p className={styles.summaryLabel}>Resumo do presente</p>
        <div className={styles.summaryContent}>
          {gift.image_url && (
            <div className={styles.summaryImgWrap}>
              <img src={gift.image_url} alt={gift.name} className={styles.summaryImg} />
            </div>
          )}
          <div className={styles.summaryInfo}>
            <h3 className={styles.summaryName}>{gift.name}</h3>
            {gift.description && (
              <p className={styles.summaryDesc}>{gift.description}</p>
            )}
            <p className={styles.summaryPrice}>{formatBRL(gift.price_cents)}</p>
          </div>
        </div>
      </div>

      <div className={styles.messageField}>
        <label htmlFor="message" className={styles.messageLabel}>
          Mensagem para os noivos{' '}
          <span>(opcional)</span>
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Deixe uma mensagem especial para Raíssa e Felipe…"
          className={styles.textarea}
        />
        <p className={styles.charCount}>{message.length}/500</p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" disabled={loading} className={styles.submitBtn}>
        {loading ? 'Aguarde…' : 'Ir para o pagamento →'}
      </button>

      <div className={styles.secure}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Pagamento seguro e criptografado via Stripe</span>
      </div>
    </form>
  )
}

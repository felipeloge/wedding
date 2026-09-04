/** @jsxImportSource react */
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
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giftId: gift.id,
          buyerMessage: message,
        }),
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
    <form
      className={styles.CheckoutForm}
      onSubmit={handleSubmit}
    >
      <div className={styles.CheckoutSummary}>
        <p className={styles.CheckoutSummaryLabel}>Resumo do presente</p>
        <div className={styles.CheckoutSummaryContent}>
          {gift.image_url ? (
            <div className={styles.CheckoutSummaryImgWrap}>
              <img
                className={styles.CheckoutSummaryImg}
                src={gift.image_url}
                alt={gift.name}
              />
            </div>
          ) : null}
          <div className={styles.CheckoutSummaryInfo}>
            <h3 className={styles.CheckoutSummaryName}>
              {gift.name}
            </h3>
            <p className={styles.CheckoutSummaryPrice}>
              {formatBRL(gift.price_cents)}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.CheckoutMessage}>
        <label htmlFor="message" className={styles.CheckoutMessageLabel}>
          Mensagem para os noivos{' '}
          <span>(opcional)</span>
        </label>
        <textarea
          className={styles.CheckoutMessageInput}
          id="message"
          value={message}
          maxLength={500}
          rows={4}
          placeholder="Deixe uma mensagem especial para Raíssa e Felipe..."
          onChange={(ev) => setMessage(ev.target.value)}
        />
        <p className={styles.CheckoutMessageCharCount}>{message.length}/500</p>
      </div>

      {error ? (
        <p className={styles.CheckoutError}>{error}</p>
      ) : null}

      <button
        className={styles.CheckoutSubmitButton}
        type="submit"
        disabled={loading}
      >
        {loading ? 'Aguarde…' : 'Ir para o pagamento →'}
      </button>

      <div className={styles.CheckoutSecureMessage}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Pagamento seguro e criptografado via Mercado Pago.</span>
      </div>
    </form>
  )
}

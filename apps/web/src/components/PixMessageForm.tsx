/** @jsxImportSource react */
import { useState } from 'react'
import styles from './PixMessageForm.module.scss'

export function PixMessageForm() {
  const [name, setName]       = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/send-pix-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao enviar mensagem')
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className={styles.PixMessageSent}>
        <h3 className={styles.PixMessageSentTitle}>Mensagem enviada! 🌿</h3>
        <p className={styles.PixMessageSentText}>
          Obrigado, {name}! Sua mensagem chegará com muito carinho para Raíssa e Felipe.
        </p>
        <a className={styles.PixMessageSentLink} href="/presentes">
          Voltar para a lista de presentes
        </a>
      </div>
    )
  }

  return (
    <form
      className={styles.PixMessageForm}
      onSubmit={handleSubmit}
    >
      <div className={styles.PixMessageField}>
        <label htmlFor="name" className={styles.PixMessageLabel}>
          Nome
        </label>
        <input
          className={styles.PixMessageInput}
          id="name"
          type="text"
          value={name}
          maxLength={200}
          required
          placeholder="Seu nome"
          onChange={(ev) => setName(ev.target.value)}
        />
      </div>

      <div className={styles.PixMessageField}>
        <label htmlFor="message" className={styles.PixMessageLabel}>
          Mensagem
        </label>
        <textarea
          className={styles.PixMessageTextarea}
          id="message"
          value={message}
          maxLength={1000}
          rows={5}
          required
          placeholder="Deixe uma mensagem especial para Raíssa e Felipe..."
          onChange={(ev) => setMessage(ev.target.value)}
        />
        <p className={styles.PixMessageCharCount}>{message.length}/1000</p>
      </div>

      {error ? (
        <p className={styles.PixMessageError}>{error}</p>
      ) : null}

      <button
        className={styles.PixMessageSubmitButton}
        type="submit"
        disabled={loading}
      >
        {loading ? 'Enviando…' : 'Enviar mensagem'}
      </button>
    </form>
  )
}

import type { Gift } from '@wedding/supabase'
import styles from './GiftGrid.module.scss'

interface Props {
  gifts: Gift[]
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function GiftGrid({ gifts }: Props) {
  if (gifts.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Em breve, nossa lista estará disponível.</p>
        <p className={styles.emptyText}>Sua presença é o maior presente! 🌿</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {gifts.map((gift) => (
        <article key={gift.id} className={styles.card}>
          <div className={styles.imageWrap}>
            {gift.image_url ? (
              <img
                src={gift.image_url}
                alt={gift.name}
                className={styles.img}
                loading="lazy"
              />
            ) : (
              <div className={styles.imgPlaceholder}>
                <span className={styles.imgPlaceholderText}>R&F</span>
              </div>
            )}
          </div>
          <div className={styles.body}>
            <h3 className={styles.title}>{gift.name}</h3>
            {gift.description && (
              <p className={styles.desc}>{gift.description}</p>
            )}
            <div className={styles.footer}>
              <span className={styles.price}>{formatBRL(gift.price_cents)}</span>
              <a href={`/checkout/${gift.id}`} className={styles.buyBtn}>Comprar</a>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

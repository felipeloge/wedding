/** @jsxImportSource react */
import type { Gift } from '@wedding/supabase';
import styles from './GiftGrid.module.scss';

interface Props {
  gifts: Gift[]
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function GiftGrid({ gifts }: Props) {
  if (gifts.length === 0) {
    return (
      <div className={styles.GridEmpty}>
        <p className={styles.GridEmptyMessage}>Em breve, nossa lista estará disponível.</p>
      </div>
    );
  }

  return (
    <div className={styles.Grid}>
      {gifts.map((gift) => (
        <div
          className={styles.Card}
          key={gift.id}
        >
          <div className={styles.CardImageWrap}>
            {gift.image_url ? (
              <img
                className={styles.CardImage}
                src={gift.image_url}
                alt={gift.name}
                loading="lazy"
              />
            ) : null}
          </div>
          <div className={styles.CardContent}>
            <h3 className={styles.CardTitle}>
              {gift.name}
            </h3>
            <div className={styles.CardFooter}>
              <span className={styles.CardItemPrice}>
                {formatBRL(gift.price_cents)}
              </span>
              <a
                href={`/checkout/${gift.id}`}
                className={styles.CardButton}
              >
                Presentear
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

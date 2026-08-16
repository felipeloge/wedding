import { useState, useEffect, useCallback } from 'react'
import styles from './PreWeddingCarousel.module.scss'

interface Props {
  images?: string[]
}

const PLACEHOLDER_COUNT = 5

export function PreWeddingCarousel({ images }: Props) {
  const [current, setCurrent] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const slides = images && images.length > 0 ? images : null
  const count = slides ? slides.length : PLACEHOLDER_COUNT

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % count)
  }, [count])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + count) % count)
  }, [count])

  useEffect(() => {
    if (!isAutoPlaying) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlaying, next])

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${styles.slide}${index === current ? ` ${styles.active}` : ''}`}
        >
          {slides ? (
            <img
              src={slides[index]}
              alt={`Foto ${index + 1} do pré-wedding de Raíssa e Felipe`}
              className={styles.img}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          ) : (
            <div className={styles.placeholder}>
              <span className={styles.placeholderText}>R & F</span>
            </div>
          )}
          <div className={styles.overlay} />
        </div>
      ))}

      <button
        onClick={prev}
        className={`${styles.btn} ${styles.btnPrev}`}
        aria-label="Foto anterior"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        onClick={next}
        className={`${styles.btn} ${styles.btnNext}`}
        aria-label="Próxima foto"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className={styles.dots}>
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`${styles.dot}${index === current ? ` ${styles.active}` : ''}`}
            aria-label={`Ir para foto ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

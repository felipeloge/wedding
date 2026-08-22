/** @jsxImportSource react */
import { useState, useEffect } from 'react'
import styles from './HeroCountdown.module.scss'

// Wedding date: November 28, 2026 at 1:00 PM Brasília time
const WEDDING_DATE = new Date('2026-11-28T17:00:00-03:00')

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(): TimeLeft {
  const now = new Date()
  const diff = WEDDING_DATE.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

const LABELS: Record<string, string> = {
  days: 'Dias',
  hours: 'Horas',
  minutes: 'Min',
  seconds: 'Seg',
}

export function HeroCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { days, hours, minutes, seconds } = timeLeft
  const isPast = days === 0 && hours === 0 && minutes === 0 && seconds === 0

  if (isPast) {
    return <p className={styles.message}>O grande dia chegou! ✨</p>
  }

  return (
    <div className={styles.countdown}>
      {(
        [
          { value: days, key: 'days' },
          { value: hours, key: 'hours' },
          { value: minutes, key: 'minutes' },
          { value: seconds, key: 'seconds' },
        ] as const
      ).map(({ value, key }, i) => (
        <div key={key} className={styles.item}>
          <div className={styles.unit}>
            <div className={styles.box}>
              <span className={styles.value}>
                {String(value).padStart(2, '0')}
              </span>
            </div>
            <span className={styles.label}>{LABELS[key]}</span>
          </div>
          {i < 3 && <span className={styles.separator}>·</span>}
        </div>
      ))}
    </div>
  )
}

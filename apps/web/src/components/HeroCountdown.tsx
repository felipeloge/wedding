import { useState, useEffect } from 'react'

// Wedding date: November 28, 2026 at 1:00 PM Brasília time
const WEDDING_DATE = new Date('2026-11-28T13:00:00-03:00')

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
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTimeLeft(getTimeLeft())
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!timeLeft) return null

  const { days, hours, minutes, seconds } = timeLeft
  const isPast = days === 0 && hours === 0 && minutes === 0 && seconds === 0

  if (isPast) {
    return (
      <p className="font-display text-2xl italic text-white/90">
        O grande dia chegou! ✨
      </p>
    )
  }

  return (
    <div className="flex items-start gap-3 md:gap-5">
      {(
        [
          { value: days, key: 'days' },
          { value: hours, key: 'hours' },
          { value: minutes, key: 'minutes' },
          { value: seconds, key: 'seconds' },
        ] as const
      ).map(({ value, key }, i) => (
        <div key={key} className="flex items-start">
          <div className="flex flex-col items-center">
            <div className="backdrop-blur-sm bg-white/10 border border-white/20 px-3 py-2 md:px-5 md:py-3 min-w-[52px] md:min-w-[68px] text-center">
              <span className="font-display text-2xl md:text-4xl font-bold text-white tabular-nums">
                {String(value).padStart(2, '0')}
              </span>
            </div>
            <span className="mt-1.5 font-body text-[10px] uppercase tracking-[0.15em] text-white/60">
              {LABELS[key]}
            </span>
          </div>
          {i < 3 && (
            <span className="font-display text-xl md:text-3xl text-white/50 mt-1.5 md:mt-2 ml-3 md:ml-5">
              ·
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

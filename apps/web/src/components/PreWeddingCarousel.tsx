import { useState, useEffect, useCallback } from 'react'

interface Props {
  images?: string[]
}

const PLACEHOLDER_COUNT = 5

export function PreWeddingCarousel({ images }: Props) {
  const [current, setCurrent] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Use placeholder gradient slides if no images provided
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

  const gradients = [
    'from-primary-dark to-primary',
    'from-primary to-secondary',
    'from-secondary to-primary-dark',
    'from-primary/80 to-primary-dark/60',
    'from-primary-dark/70 to-secondary/80',
  ]

  return (
    <div
      className="relative overflow-hidden bg-primary-dark"
      style={{ height: 'clamp(320px, 65vh, 700px)' }}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Slides */}
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {slides ? (
            <img
              src={slides[index]}
              alt={`Foto ${index + 1} do pré-wedding de Raíssa e Felipe`}
              className="w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          ) : (
            // Placeholder gradient for development
            <div
              className={`w-full h-full bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center`}
            >
              <span className="font-display text-6xl md:text-8xl text-white/10 select-none">
                R & F
              </span>
            </div>
          )}
          {/* Subtle darkening overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/40 via-transparent to-transparent" />
        </div>
      ))}

      {/* Prev / Next buttons */}
      <button
        onClick={prev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors focus:outline-none"
        aria-label="Foto anterior"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        onClick={next}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors focus:outline-none"
        aria-label="Próxima foto"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`rounded-full transition-all duration-300 focus:outline-none ${
              index === current
                ? 'w-5 h-1.5 bg-white'
                : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Ir para foto ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

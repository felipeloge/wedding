import type { Gift } from '@wedding/supabase'

interface Props {
  gifts: Gift[]
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function GiftGrid({ gifts }: Props) {
  if (gifts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-xl text-text-muted">
          Em breve, nossa lista estará disponível.
        </p>
        <p className="font-body text-sm text-text-muted mt-2">
          Sua presença é o maior presente! 🌿
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
      {gifts.map((gift) => (
        <article key={gift.id} className="bg-surface-lowest group flex flex-col">
          {/* Image */}
          <div className="aspect-[4/3] overflow-hidden bg-surface-low">
            {gift.image_url ? (
              <img
                src={gift.image_url}
                alt={gift.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-low to-surface">
                <span className="font-display text-4xl text-text-muted/20 select-none">R&F</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col flex-1">
            <h3 className="font-display text-lg text-text leading-snug mb-1">{gift.name}</h3>
            {gift.description && (
              <p className="font-body text-sm text-text-muted leading-relaxed mb-4 line-clamp-2 flex-1">
                {gift.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
              <span className="font-body text-base text-primary font-medium">
                {formatBRL(gift.price_cents)}
              </span>
              <a
                href={`/checkout/${gift.id}`}
                className="font-body text-xs uppercase tracking-widest text-white bg-primary px-5 py-2.5 hover:bg-primary-dark transition-colors duration-200"
              >
                Comprar
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

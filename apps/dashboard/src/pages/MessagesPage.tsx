import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PixMessage } from '../lib/types'
import { formatDate } from '../lib/utils'

export function MessagesPage() {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['pix-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pix_messages')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PixMessage[]
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-text">Mensagens</h1>
        <p className="font-body text-sm text-text-muted mt-1">
          {messages.length} mensagem{messages.length === 1 ? '' : 's'} recebida{messages.length === 1 ? '' : 's'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-surface-lowest border border-border text-center py-20">
          <p className="font-body text-sm text-text-muted">Nenhuma mensagem recebida ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className="bg-surface-lowest border border-border px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-body text-sm text-text font-medium">{message.name}</p>
                <p className="font-body text-xs text-text-muted whitespace-nowrap">
                  {formatDate(message.created_at)}
                </p>
              </div>
              <p className="font-body text-sm text-text-muted mt-2 whitespace-pre-wrap">
                {message.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

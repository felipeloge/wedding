import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Payment } from '../lib/types'
import { formatCents, formatDate } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

type PaymentWithGift = Payment & { gifts: { name: string } | null }

const STATUS_LABELS: Record<string, string> = {
  completed: 'Concluído',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado',
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Cartão',
  pix: 'PIX',
  credit_card: 'Crédito',
  debit_card: 'Débito',
}

function exportCsv(payments: PaymentWithGift[]) {
  const headers = ['Data', 'Comprador', 'Email', 'Presente', 'Valor', 'Método', 'Parcelas', 'Status']
  const rows = payments.map((p) => [
    formatDate(p.paid_at ?? p.created_at),
    p.buyer_name ?? '',
    p.buyer_email ?? '',
    p.gifts?.name ?? '',
    formatCents(p.amount_cents),
    METHOD_LABELS[p.payment_method ?? ''] ?? p.payment_method ?? '',
    String(p.installments),
    STATUS_LABELS[p.status] ?? p.status,
  ])
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, gifts(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PaymentWithGift[]
    },
  })

  const filtered =
    statusFilter === 'all' ? payments : payments.filter((p) => p.status === statusFilter)

  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((acc, p) => acc + p.amount_cents, 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-text">Pagamentos</h1>
          <p className="font-body text-sm text-text-muted mt-1">
            Total recebido:{' '}
            <span className="text-text font-medium">{formatCents(totalRevenue)}</span>
            {' '}· {payments.filter((p) => p.status === 'completed').length} concluídos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'completed', label: 'Concluídos' },
          { value: 'pending', label: 'Pendentes' },
          { value: 'failed', label: 'Falhados' },
          { value: 'refunded', label: 'Reembolsados' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`font-body text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
              statusFilter === value
                ? 'bg-primary text-white border-primary'
                : 'border-border text-text-muted hover:border-primary/40 hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-lowest border border-border text-center py-20">
          <p className="font-body text-sm text-text-muted">Nenhum pagamento encontrado.</p>
        </div>
      ) : (
        <div className="bg-surface-lowest border border-border overflow-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border bg-surface-low">
                {['Data', 'Comprador', 'Presente', 'Valor', 'Método', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-body text-[10px] uppercase tracking-widest text-text-muted font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-border last:border-0 hover:bg-surface-low/40 transition-colors"
                >
                  <td className="px-4 py-3 font-body text-xs text-text-muted whitespace-nowrap">
                    {formatDate(payment.paid_at ?? payment.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-body text-sm text-text">
                      {payment.buyer_name ?? '—'}
                    </p>
                    {payment.buyer_email ? (
                      <p className="font-body text-xs text-text-muted">{payment.buyer_email}</p>
                    ) : null}
                    {payment.buyer_message ? (
                      <p className="font-body text-xs text-text-muted mt-1">
                        <strong>Mensagem:</strong>
                        <br />
                        {payment.buyer_message}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-text-muted max-w-[200px] truncate">
                    {payment.gifts?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-text whitespace-nowrap">
                    {formatCents(payment.amount_cents)}
                    {payment.installments > 1 && (
                      <span className="text-text-muted ml-1 text-xs">/{payment.installments}x</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-text-muted">
                    {METHOD_LABELS[payment.payment_method ?? ''] ?? payment.payment_method ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        payment.status === 'completed'
                          ? 'default'
                          : payment.status === 'refunded'
                            ? 'secondary'
                            : payment.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                      }
                    >
                      {STATUS_LABELS[payment.status] ?? payment.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

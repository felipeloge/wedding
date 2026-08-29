import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Gift, CreditCard, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCents, formatDate } from '../lib/utils'
import { Badge } from '../components/ui/badge'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
}) {
  return (
    <div className="bg-surface-lowest border border-border p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-body text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">{label}</p>
          <p className="font-display text-3xl text-text">{value}</p>
          {sub && <p className="font-body text-xs text-text-muted mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  )
}

export function DashboardHomePage() {
  const { data: gifts = [] } = useQuery({
    queryKey: ['gifts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gifts').select('*')
      if (error) throw error
      return data
    },
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, gifts(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
  })

  const { data: allPayments = [] } = useQuery({
    queryKey: ['payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount_cents, status')
      if (error) throw error
      return data
    },
  })

  const totalRevenue = allPayments
    .filter((p) => p.status === 'completed')
    .reduce((acc, p) => acc + p.amount_cents, 0)

  const availableGifts = gifts.filter((g) => g.is_available).length
  const soldGifts = gifts.filter((g) => !g.is_available).length

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl text-text">Visão Geral</h1>
        <p className="font-body text-sm text-text-muted mt-1">
          Bem-vindo ao painel de gerenciamento do casamento.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Total de presentes"
          value={gifts.length}
          sub={`${availableGifts} disponíveis · ${soldGifts} comprados`}
          icon={Gift}
        />
        <StatCard
          label="Total arrecadado"
          value={formatCents(totalRevenue)}
          sub={`${allPayments.filter((p) => p.status === 'completed').length} pagamentos`}
          icon={CreditCard}
        />
        <StatCard
          label="Pagamentos pendentes"
          value={allPayments.filter((p) => p.status === 'pending').length}
          sub="Aguardando confirmação"
          icon={CreditCard}
        />
      </div>

      {/* Recent payments */}
      <div className="bg-surface-lowest border border-border shadow-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-base text-text">Pagamentos Recentes</h2>
          <Link
            to="/dashboard/payments"
            className="flex items-center gap-1 font-body text-xs uppercase tracking-widest text-primary hover:text-primary-dark transition-colors"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {payments.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-body text-sm text-text-muted">Nenhum pagamento registrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-surface-low">
                {['Comprador', 'Presente', 'Valor', 'Data', 'Status'].map((h) => (
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
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-surface-low/50 transition-colors">
                  <td className="px-4 py-3 font-body text-sm text-text">
                    {payment.buyer_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-text-muted">
                    {(payment as { gifts?: { name: string } | null }).gifts?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-text">
                    {formatCents(payment.amount_cents)}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-text-muted">
                    {formatDate(payment.paid_at ?? payment.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        payment.status === 'completed'
                          ? 'default'
                          : payment.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {payment.status === 'completed'
                        ? 'Concluído'
                        : payment.status === 'pending'
                          ? 'Pendente'
                          : 'Falhou'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

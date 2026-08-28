import { useNavigate, Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Gift, CreditCard, Users, LogOut, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral', exact: true },
  { to: '/dashboard/gifts', icon: Gift, label: 'Presentes' },
  { to: '/dashboard/payments', icon: CreditCard, label: 'Pagamentos' },
  { to: '/dashboard/guests', icon: Users, label: 'Convidados' },
]

export function AppSidebar() {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return pathname === to
    return pathname === to || pathname.startsWith(to + '/')
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-surface-lowest border-r border-border flex flex-col min-h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <Link to="/" className="block">
          <p className="font-display text-xl tracking-widest text-text">R & F</p>
          <p className="font-body text-[9px] uppercase tracking-[0.25em] text-text-muted mt-0.5">
            Gerenciamento
          </p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 font-body text-sm transition-colors rounded-none',
              isActive(to, exact)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-text-muted hover:bg-surface hover:text-text',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border space-y-0.5">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 font-body text-sm text-text-muted hover:text-text hover:bg-surface transition-colors"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          Ver website
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 font-body text-sm text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}

import { useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { AppSidebar } from '../components/AppSidebar'

export function DashboardLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <AppSidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 bg-surface-lowest border-b border-border md:hidden">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 rounded hover:bg-surface transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-text" />
          </button>
          <p className="font-display text-lg tracking-widest text-text">R &amp; F</p>
        </header>

        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

import { Outlet } from '@tanstack/react-router'
import { AppSidebar } from '../components/AppSidebar'

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

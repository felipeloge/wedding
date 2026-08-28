import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { RootLayout } from './layouts/RootLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardHomePage } from './pages/DashboardHomePage'
import { GiftsPage } from './pages/GiftsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { GuestsPage } from './pages/GuestsPage'
import { supabase } from './lib/supabase'

// ── Root ──────────────────────────────────────────────────────
const rootRoute = createRootRoute({ component: RootLayout })

// ── Public ────────────────────────────────────────────────────
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) throw redirect({ to: '/dashboard' })
  },
})

// ── Auth guard (pathless) ─────────────────────────────────────
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  component: () => <Outlet />,
})

// ── Dashboard layout ──────────────────────────────────────────
const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/dashboard',
  component: DashboardLayout,
})

const dashboardIndexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: DashboardHomePage,
})

const giftsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/gifts',
  component: GiftsPage,
})

const paymentsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/payments',
  component: PaymentsPage,
})

const guestsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/guests',
  component: GuestsPage,
})

// ── Route tree ────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute.addChildren([dashboardIndexRoute, giftsRoute, paymentsRoute, guestsRoute]),
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

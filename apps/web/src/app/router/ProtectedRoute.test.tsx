import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const f = vi.hoisted(() => ({
  organization: { organizationId: null as string | null, loading: false, error: new Error('Missing profile') as Error | null, retry: vi.fn() },
  plan: null as { subscriptionStatus: string; trialEndsAt: string } | null,
  subscription: { subscription_ends_at: null as string | null, grace_period_days: 3 },
}))
vi.mock('../../core/auth/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, loading: false }) }))
vi.mock('../../core/organizations/useOrganizationId', () => ({ useOrganizationId: () => f.organization }))
vi.mock('../../core/subscriptions/useOrganizationPlan', () => ({ useOrganizationPlan: () => ({ data: f.plan, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('../../features/pos/services/offlinePosService', () => ({ useOfflineSalesCount: () => 0, syncOfflineSales: vi.fn() }))
vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, id: string) => ({
          single: async () => table === 'stores' && column === 'id' && id === 'org-a'
            ? { data: f.subscription, error: null }
            : { data: null, error: new Error('Unknown organization') },
        }),
      }),
    }),
  },
}))
import { ProtectedRoute } from './ProtectedRoute'
beforeEach(() => {
  f.organization.organizationId = null
  f.organization.error = new Error('Missing profile')
  f.plan = null
  f.subscription.subscription_ends_at = null
})
afterEach(cleanup)

function renderProtectedRoute() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<h1>Área privada</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('shows a retryable access error instead of loading forever without a profile', () => {
  renderProtectedRoute()
  expect(screen.queryByText('Verificando acceso a tu organización...')).toBeNull()
  expect(screen.getByRole('button', { name: /Reintentar/i })).toBeTruthy()
})

it('explains a suspended trial using organization terminology', async () => {
  f.organization.organizationId = 'org-a'
  f.organization.error = null
  f.plan = { subscriptionStatus: 'trialing', trialEndsAt: '2000-01-01T00:00:00Z' }
  renderProtectedRoute()
  expect(await screen.findByText('Acceso suspendido')).toBeTruthy()
  expect(screen.getByText(/prueba gratuita de la organización ha finalizado/i)).toBeTruthy()
})

it('opens a past due account during its configured grace period', async () => {
  f.organization.organizationId = 'org-a'
  f.organization.error = null
  f.plan = { subscriptionStatus: 'past_due', trialEndsAt: '2000-01-01T00:00:00Z' }
  f.subscription.subscription_ends_at = new Date(Date.now() - 36 * 3_600_000).toISOString()
  renderProtectedRoute()
  expect(await screen.findByRole('heading', { name: 'Área privada' })).toBeTruthy()
  expect(screen.getByText(/cuentas con 2 días de gracia/i)).toBeTruthy()
})

it('blocks a past due account when its configured grace period ends', async () => {
  f.organization.organizationId = 'org-a'
  f.organization.error = null
  f.plan = { subscriptionStatus: 'past_due', trialEndsAt: '2000-01-01T00:00:00Z' }
  f.subscription.subscription_ends_at = new Date(Date.now() - 4 * 86_400_000).toISOString()
  renderProtectedRoute()
  expect(await screen.findByText('Acceso suspendido')).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Área privada' })).toBeNull()
})

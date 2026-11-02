import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
const f = vi.hoisted(() => ({ store: { storeId: null as string | null, loading: false, error: new Error('Missing profile'), retry: vi.fn() } }))
vi.mock('./hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, loading: false }) }))
vi.mock('../../shared/hooks/useStoreId', () => ({ useStoreId: () => f.store }))
vi.mock('../../shared/hooks/useStorePlan', () => ({ useStorePlan: () => ({ data: null, isLoading: false, isError: true, refetch: vi.fn() }) }))
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('../../features/pos/services/offlinePosService', () => ({ useOfflineSalesCount: () => 0, syncOfflineSales: vi.fn() }))
vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: {} }))
import { ProtectedRoute } from '../../app/router/ProtectedRoute'
it('shows a retryable access error instead of loading forever without a profile', () => {
  render(<ProtectedRoute />)
  expect(screen.queryByText('Verificando acceso a tu tienda...')).toBeNull()
  expect(screen.getByRole('button', { name: /Reintentar/i })).toBeTruthy()
})

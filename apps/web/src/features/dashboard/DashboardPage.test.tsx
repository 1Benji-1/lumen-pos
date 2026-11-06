import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'

const access = vi.hoisted(() => ({ inventory: false, analytics: false }))
vi.mock('../../shared/hooks/useStoreModules', () => ({
  useStoreModules: () => ({ storeId: 'store-a', storeName: 'Tienda de prueba', isLoading: false, canAccessModule: (id: string) => id === 'inventory' ? access.inventory : id === 'analytics' ? access.analytics : true }),
}))
vi.mock('../../shared/hooks/useCurrentUserRole', () => ({ useCurrentUserRole: () => ({ loading: false, hasPermission: () => true }) }))
vi.mock('./hooks/useDashboardData', () => ({
  useDashboardData: () => ({ data: null, isLoading: false, isError: false, error: null, refetch: vi.fn(), isRefetching: false, dataUpdatedAt: null }),
}))
vi.mock('../inventory/components/QuickAdjustmentModal', () => ({ QuickAdjustmentModal: () => null }))
vi.mock('../pos/components/CorteXModal', () => ({ CorteXModal: () => null }))

beforeEach(() => { access.inventory = false; access.analytics = false })
afterEach(cleanup)

it('does not advertise unavailable inventory or analytics on the dashboard', () => {
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(screen.queryByText('Alertas de stock')).toBeNull()
  expect(screen.queryByText('Artículos críticos')).toBeNull()
  expect(screen.queryByText('Ver analíticas completas')).toBeNull()
  expect(screen.queryByText('Auditar arqueos')).toBeNull()
})

it('shows inventory and analytics actions when both modules are available', () => {
  access.inventory = true
  access.analytics = true
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(screen.getByText('Alertas de stock')).toBeTruthy()
  expect(screen.getByText('Artículos críticos')).toBeTruthy()
  expect(screen.getByText('Ver analíticas completas')).toBeTruthy()
})

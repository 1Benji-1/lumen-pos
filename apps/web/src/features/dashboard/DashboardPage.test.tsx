import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from './DashboardPage'

const access = vi.hoisted(() => ({ inventory: false, analytics: false, pos: true, familyId: 'retail', categoryId: 'comercio_general' }))
vi.mock('../../shared/hooks/useStoreModules', () => ({
  useStoreModules: () => ({ storeId: 'store-a', storeName: 'Tienda de prueba', profile: { familyId: access.familyId, categoryId: access.categoryId }, isLoading: false, canAccessModule: (id: string) => id === 'inventory' ? access.inventory : id === 'analytics' ? access.analytics : id === 'pos' ? access.pos : true }),
}))
vi.mock('../../shared/hooks/useCurrentUserRole', () => ({ useCurrentUserRole: () => ({ loading: false, hasPermission: () => true }) }))
vi.mock('./hooks/useDashboardData', () => ({
  useDashboardData: () => ({ data: null, isLoading: false, isError: false, error: null, refetch: vi.fn(), isRefetching: false, dataUpdatedAt: null }),
}))
vi.mock('../inventory/components/QuickAdjustmentModal', () => ({ QuickAdjustmentModal: () => null }))
vi.mock('../pos/components/CorteXModal', () => ({ CorteXModal: () => null }))
const sales = vi.hoisted(() => vi.fn(async () => ({ totalAmount: 120, transactionCount: 2, averageTicket: 60 })))
vi.mock('./services/dashboardService', () => ({ getTodaySalesSummary: sales, getLowStockAlerts: vi.fn(async () => ({ lowStockCount: 1, outOfStockCount: 0, items: [] })) }))

beforeEach(() => { access.inventory = false; access.analytics = false; access.pos = true; access.familyId = 'retail'; access.categoryId = 'comercio_general'; sales.mockClear() })
afterEach(cleanup)

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><DashboardPage /></MemoryRouter></QueryClientProvider>)
}

it('does not advertise unavailable inventory or analytics on the dashboard', () => {
  renderDashboard()
  expect(screen.queryByText('Alertas de stock')).toBeNull()
  expect(screen.queryByText('Artículos críticos')).toBeNull()
  expect(screen.queryByText('Ver analíticas completas')).toBeNull()
  expect(screen.queryByText('Auditar arqueos')).toBeNull()
})

it('shows inventory and analytics actions when both modules are available', () => {
  access.inventory = true
  access.analytics = true
  renderDashboard()
  expect(screen.getByText('Alertas de stock')).toBeTruthy()
  expect(screen.getByText('Artículos críticos')).toBeTruthy()
  expect(screen.getByText('Ver analíticas completas')).toBeTruthy()
})

it('gives dark kitchens an inventory overview without POS or cash metrics', () => {
  access.familyId = 'gastronomy'; access.categoryId = 'dark_kitchen'; access.pos = false; access.inventory = true
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Inventario y clientes' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Revisar inventario' })).toBeTruthy()
  expect(screen.queryByText('Ventas de hoy')).toBeNull()
  expect(screen.queryByText('Dinero en gavetas físicas')).toBeNull()
  expect(screen.queryByRole('link', { name: /Pedidos|Cocina/ })).toBeNull()
  expect(sales).not.toHaveBeenCalled()
})

it('gives service businesses their own priorities without inventing appointments', () => {
  access.familyId = 'services'; access.categoryId = 'barberia_belleza'; access.inventory = false
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Atención y ventas' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Abrir punto de venta' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: /Agenda/ })).toBeNull()
  expect(screen.queryByText('Alertas de stock')).toBeNull()
})

it('removes sales and cash from retail when POS is deactivated', () => {
  access.pos = false; access.inventory = true
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Catálogo y existencias' })).toBeTruthy()
  expect(screen.queryByText('Ventas de hoy')).toBeNull()
  expect(sales).not.toHaveBeenCalled()
})

it('shows wholesale inventory first without advertising planned ordering', () => {
  access.familyId = 'wholesale'; access.categoryId = 'distribuidor'; access.pos = false; access.inventory = true
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Catálogo y distribución' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Revisar inventario' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: /Pedidos|Delivery|Cotizaciones/ })).toBeNull()
  expect(screen.getByText(/Compras · Pedidos · Cotizaciones · Crédito · Delivery/)).toBeTruthy()
})

it('shows a manually enabled POS in the wholesale dashboard', () => {
  access.familyId = 'wholesale'; access.categoryId = 'mayorista_general'; access.pos = true; access.inventory = true
  renderDashboard()
  expect(screen.getByRole('link', { name: 'Punto de venta' })).toBeTruthy()
})

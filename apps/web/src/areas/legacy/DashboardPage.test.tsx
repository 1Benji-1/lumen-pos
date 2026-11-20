import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrganizationHome } from '../../app/router/OrganizationHome'

const access = vi.hoisted(() => ({
  inventory: false, analytics: false, pos: true, areaId: 'commerce' as string | null,
  compatibilityMode: false, defaultModuleIds: [] as string[],
}))
vi.mock('../../core/access/useOrganizationModules', () => ({
  useOrganizationModules: () => ({ organizationId: 'store-a', organizationName: 'Organización de prueba', areaId: access.areaId, compatibilityMode: access.compatibilityMode, defaultModuleIds: access.defaultModuleIds, isLoading: false, canAccessModule: (id: string) => id === 'inventory' ? access.inventory : id === 'analytics' ? access.analytics : id === 'pos' ? access.pos : true }),
}))
vi.mock('../../core/users/useCurrentUserRole', () => ({ useCurrentUserRole: () => ({ loading: false, hasPermission: () => true }) }))
vi.mock('./hooks/useDashboardData', () => ({
  useDashboardData: () => ({ data: null, isLoading: false, isError: false, error: null, refetch: vi.fn(), isRefetching: false, dataUpdatedAt: null }),
}))
vi.mock('../../features/inventory/components/QuickAdjustmentModal', () => ({ QuickAdjustmentModal: () => null }))
vi.mock('../../features/pos/components/CorteXModal', () => ({ CorteXModal: () => null }))
const sales = vi.hoisted(() => vi.fn(async () => ({ totalAmount: 120, transactionCount: 2, averageTicket: 60 })))
vi.mock('./services/dashboardService', () => ({ getTodaySalesSummary: sales, getLowStockAlerts: vi.fn(async () => ({ lowStockCount: 1, outOfStockCount: 0, items: [] })) }))

beforeEach(() => {
  Object.assign(access, { inventory: false, analytics: false, pos: true, areaId: 'commerce', compatibilityMode: false, defaultModuleIds: [] })
  sales.mockClear()
})
afterEach(cleanup)

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><OrganizationHome /></MemoryRouter></QueryClientProvider>)
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
  access.areaId = 'gastronomy'; access.pos = false; access.inventory = true
  access.defaultModuleIds = ['orders', 'kitchen']
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Operación gastronómica' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Revisar inventario' })).toBeTruthy()
  expect(screen.queryByText('Ventas de hoy')).toBeNull()
  expect(screen.queryByText('Dinero en gavetas físicas')).toBeNull()
  expect(screen.queryByRole('link', { name: /Pedidos|Cocina/ })).toBeNull()
  expect(sales).not.toHaveBeenCalled()
})

it('gives service businesses their own priorities without inventing appointments', () => {
  access.areaId = null; access.compatibilityMode = true; access.inventory = false
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Operación de la organización' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Abrir punto de venta' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: /Agenda/ })).toBeNull()
  expect(screen.queryByText('Alertas de stock')).toBeNull()
})

it('describes a medical practice without offering unfinished clinical records', () => {
  access.areaId = 'health'; access.inventory = false
  access.defaultModuleIds = ['agenda', 'clinical_records', 'prescriptions', 'medical_documents']
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Gestión del consultorio' })).toBeTruthy()
  expect(screen.getByText(/Historia clínica · Recetas médicas · Documentos médicos/)).toBeTruthy()
  expect(screen.queryByRole('link', { name: /Historia clínica|Recetas médicas/ })).toBeNull()
  expect(screen.queryByRole('link', { name: /Caja|Punto de venta/ })).toBeNull()
  expect(sales).not.toHaveBeenCalled()
})

it('keeps authorized sales and customers on the home of a migrated clinic', () => {
  access.areaId = 'health'; access.compatibilityMode = true; access.pos = true
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Ventas de hoy' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Punto de venta' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Clientes' })).toBeTruthy()
})

it('removes sales and cash from retail when POS is deactivated', () => {
  access.pos = false; access.inventory = true
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Catálogo y existencias' })).toBeTruthy()
  expect(screen.queryByText('Ventas de hoy')).toBeNull()
  expect(sales).not.toHaveBeenCalled()
})

it('shows wholesale inventory first without advertising planned ordering', () => {
  access.compatibilityMode = true; access.pos = false; access.inventory = true
  access.defaultModuleIds = ['purchases', 'orders', 'quotes', 'credit', 'delivery']
  renderDashboard()
  expect(screen.getByRole('heading', { name: 'Catálogo y existencias' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Revisar inventario' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: /Pedidos|Delivery|Cotizaciones/ })).toBeNull()
  expect(screen.getByText(/Compras · Pedidos · Cotizaciones · Crédito · Delivery/)).toBeTruthy()
})

it('shows a manually enabled POS in the wholesale dashboard', () => {
  access.compatibilityMode = true; access.pos = true; access.inventory = true
  renderDashboard()
  expect(screen.getByRole('link', { name: 'Punto de venta' })).toBeTruthy()
})

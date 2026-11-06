import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ModuleSettingsSection } from './ModuleSettingsSection'

const fixture = vi.hoisted(() => ({
  role: 'owner',
  error: null as Error | null,
  rows: [] as { module_id: string; branch_id: string | null; enabled: boolean }[] | undefined,
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}))
vi.mock('../../../shared/hooks/useCurrentUserRole', () => ({ useCurrentUserRole: () => ({ role: fixture.role, isOwner: fixture.role === 'owner' }) }))
vi.mock('../../../shared/hooks/useStoreModules', () => ({ useStoreModules: () => ({ storeId: 'store-a', branchId: 'branch-a', profile: { familyId: 'retail', categoryId: 'comercio_general' }, isLoading: false, error: fixture.error, getModuleAccess: (id: string) => ({ allowed: id !== 'analytics', reason: id === 'analytics' ? 'plan_disabled' : 'allowed' }) }) }))
vi.mock('../../../shared/hooks/useModuleActivations', () => ({ useModuleActivations: () => ({ data: fixture.rows, isLoading: false, error: null }) }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: { rpc: fixture.rpc } }))

beforeEach(() => { fixture.role = 'owner'; fixture.error = null; fixture.rows = []; fixture.rpc.mockReset().mockResolvedValue({ data: null, error: null }) })
afterEach(cleanup)

it('lets the owner disable a module and confirms the saved change', async () => {
  render(<QueryClientProvider client={new QueryClient()}><ModuleSettingsSection /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Activación de Inventario'), { target: { value: 'false' } })
  await waitFor(() => expect(fixture.rpc).toHaveBeenCalledWith('set_module_activation', { p_store_id: 'store-a', p_module_id: 'inventory', p_enabled: false }))
  expect(await screen.findByText('Activación guardada.')).toBeTruthy()
})

it('shows status without activation controls to a staff administrator', () => {
  fixture.role = 'admin'
  render(<QueryClientProvider client={new QueryClient()}><ModuleSettingsSection /></QueryClientProvider>)
  expect(screen.getByText('Inventario')).toBeTruthy()
  expect(screen.queryByLabelText('Activación de Inventario')).toBeNull()
})

it('shows a recoverable error when module data cannot be checked', () => {
  fixture.error = new Error('offline')
  fixture.rows = undefined
  render(<QueryClientProvider client={new QueryClient()}><ModuleSettingsSection /></QueryClientProvider>)
  expect(screen.getByRole('alert').textContent).toMatch(/No se pudieron cargar/)
})

it('reports a failed save and keeps the control usable', async () => {
  fixture.rpc.mockResolvedValue({ data: null, error: { message: 'Sin conexión' } })
  render(<QueryClientProvider client={new QueryClient()}><ModuleSettingsSection /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Activación de Inventario'), { target: { value: 'false' } })
  expect((await screen.findByRole('alert')).textContent).toMatch(/Sin conexión/)
  expect((screen.getByLabelText('Activación de Inventario') as HTMLSelectElement).disabled).toBe(false)
})

it('keeps the chosen value visible while the save is pending', () => {
  fixture.rpc.mockImplementation(() => new Promise(() => {}))
  render(<QueryClientProvider client={new QueryClient()}><ModuleSettingsSection /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Activación de Inventario'), { target: { value: 'false' } })
  expect((screen.getByLabelText('Activación de Inventario') as HTMLSelectElement).value).toBe('false')
})

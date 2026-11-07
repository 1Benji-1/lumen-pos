import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AdminStoreItem } from '@lumen-pos/types'
import { StoreModulesTab } from './StoreModulesTab'

vi.mock('../services/adminStoreService', () => ({
  getStoreModuleDetails: vi.fn().mockResolvedValue({
    branch: { id: 'branch-1', name: 'Barbería Sol', category_id: 'barberia_belleza' },
    activations: [{ module_id: 'pos', branch_id: 'branch-1', enabled: false }],
    audit: [{ id: 1, module_id: 'pos', operation: 'INSERT', old_enabled: null, new_enabled: false, changed_at: '2026-11-05T20:00:00Z' }],
  }),
}))

it('shows the selected category, effective module state and activation history to admin', async () => {
  const store = { id: 'store-1', name: 'Barbería Sol', plan_features: {}, feature_overrides: {} } as AdminStoreItem
  render(<QueryClientProvider client={new QueryClient()}><StoreModulesTab store={store} /></QueryClientProvider>)
  expect(await screen.findByText('Barbería y belleza')).toBeTruthy()
  expect(screen.getByText('Punto de venta')).toBeTruthy()
  expect(screen.getByText('Desactivado')).toBeTruthy()
  expect(screen.getByText(/Historial de activaciones/)).toBeTruthy()
})

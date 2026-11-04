import { renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  store: {
    business_type: 'tienda_articulos',
    industry_sub_type: 'comercio_general',
    name: 'Tienda',
    plans: { name: 'Standard', features: { advanced_analytics: false } },
    feature_overrides: {},
  },
  branch: {
    data: { id: 'branch-a', store_id: 'store-1', name: 'Tienda', category_id: 'comercio_general', is_primary: true } as { id: string; store_id: string; name: string; category_id: string; is_primary: boolean } | null,
    isLoading: false,
    error: null as Error | null,
  },
  activations: {
    data: [] as Array<{ module_id: string; branch_id: string | null; enabled: boolean }>,
    isLoading: false,
    error: null as Error | null,
  },
}))

vi.mock('./useStoreId', () => ({ useStoreId: () => ({ storeId: 'store-1', loading: false }) }))
vi.mock('./useStorePlan', () => ({ useStorePlan: () => ({ data: fixture.store, isLoading: false, error: null }) }))
vi.mock('./usePrimaryBranch', () => ({ usePrimaryBranch: () => fixture.branch }))
vi.mock('./useModuleActivations', () => ({ useModuleActivations: () => fixture.activations }))
vi.mock('../../features/settings/hooks/useStoreSettings', () => ({ useStoreSettings: () => ({ settings: null }) }))
import { useStoreModules } from './useStoreModules'

beforeEach(() => {
  fixture.store.business_type = 'tienda_articulos'
  fixture.store.industry_sub_type = 'comercio_general'
  fixture.store.name = 'Tienda'
  fixture.store.plans.features.advanced_analytics = false
  fixture.branch.data = { id: 'branch-a', store_id: 'store-1', name: 'Tienda', category_id: 'comercio_general', is_primary: true }
  fixture.branch.isLoading = false
  fixture.branch.error = null
  fixture.activations.data = []
  fixture.activations.isLoading = false
  fixture.activations.error = null
})

it('preserves existing retail Standard navigation without activation exceptions', () => {
  const state = renderHook(() => useStoreModules()).result.current
  expect(state.branchId).toBe('branch-a')
  expect(state.availableModules.map(module => module.id)).toEqual(['dashboard', 'pos', 'inventory', 'customers', 'staff', 'settings'])
  expect(state.getModuleAccess('tables').reason).toBe('not_available_yet')
})

it('uses the stored branch category instead of legacy store fields', () => {
  fixture.branch.data!.category_id = 'barberia_belleza'
  const state = renderHook(() => useStoreModules()).result.current
  expect(state.profile).toEqual({ familyId: 'services', categoryId: 'barberia_belleza' })
  expect(state.canAccessModule('pos')).toBe(true)
  expect(state.canAccessModule('inventory')).toBe(false)
})

it('removes a branch module when its stored activation is false', () => {
  fixture.activations.data = [{ module_id: 'pos', branch_id: 'branch-a', enabled: false }]
  const state = renderHook(() => useStoreModules()).result.current
  expect(state.canAccessModule('pos')).toBe(false)
  expect(state.availableModules.map(module => module.id)).not.toContain('pos')
})

it('restores a category-omitted module but keeps a missing plan feature blocked', () => {
  fixture.branch.data!.category_id = 'barberia_belleza'
  fixture.activations.data = [
    { module_id: 'inventory', branch_id: 'branch-a', enabled: true },
    { module_id: 'analytics', branch_id: null, enabled: true },
  ]
  const state = renderHook(() => useStoreModules()).result.current
  expect(state.canAccessModule('inventory')).toBe(true)
  expect(state.getModuleAccess('analytics').reason).toBe('plan_disabled')
})

it('blocks all modules when the primary branch is missing', () => {
  fixture.branch.data = null
  const state = renderHook(() => useStoreModules()).result.current
  expect(state.error).toBeInstanceOf(Error)
  expect(state.availableModules).toEqual([])
  expect(state.getModuleAccess('pos').allowed).toBe(false)
})

it('blocks all modules while activation data is loading or fails', () => {
  fixture.activations.isLoading = true
  expect(renderHook(() => useStoreModules()).result.current.availableModules).toEqual([])
  fixture.activations.isLoading = false
  fixture.activations.error = new Error('offline')
  const state = renderHook(() => useStoreModules()).result.current
  expect(state.error?.message).toBe('offline')
  expect(state.canAccessModule('pos')).toBe(false)
})

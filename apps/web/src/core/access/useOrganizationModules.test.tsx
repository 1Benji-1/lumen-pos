import { renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  area: {
    data: {
      areaId: 'commerce',
      branchId: 'branch-a',
      defaultModuleIds: ['dashboard', 'pos', 'inventory', 'customers', 'analytics', 'staff', 'settings'],
      compatibilityMode: false,
    } as { areaId: string | null; branchId: string; defaultModuleIds: string[]; compatibilityMode: boolean } | null,
    isLoading: false,
    error: null as Error | null,
  },
  store: {
    businessType: 'tienda_articulos',
    industrySubType: 'comercio_general',
    name: 'Tienda',
    plan: { name: 'Standard', features: { advanced_analytics: false } },
    featureOverrides: {},
  },
  activations: {
    data: [] as Array<{ module_id: string; branch_id: string | null; enabled: boolean }> | undefined,
    isLoading: false,
    error: null as Error | null,
  },
}))

vi.mock('../organizations/useOrganizationId', () => ({ useOrganizationId: () => ({ organizationId: 'store-1', loading: false }) }))
vi.mock('../subscriptions/useOrganizationPlan', () => ({ useOrganizationPlan: () => ({ data: fixture.store, isLoading: false, error: null }) }))
vi.mock('./useOrganizationArea', () => ({ useOrganizationArea: () => fixture.area }))
vi.mock('./legacy/useModuleActivations', () => ({ useModuleActivations: () => fixture.activations }))
vi.mock('../configuration/useOrganizationSettings', () => ({ useOrganizationSettings: () => ({ settings: null }) }))
import { useOrganizationModules } from './useOrganizationModules'

beforeEach(() => {
  fixture.area.data = {
    areaId: 'commerce',
    branchId: 'branch-a',
    defaultModuleIds: ['dashboard', 'pos', 'inventory', 'customers', 'analytics', 'staff', 'settings'],
    compatibilityMode: false,
  }
  fixture.store.businessType = 'tienda_articulos'
  fixture.store.industrySubType = 'comercio_general'
  fixture.store.name = 'Tienda'
  fixture.store.plan.features.advanced_analytics = false
  fixture.area.isLoading = false
  fixture.area.error = null
  fixture.activations.data = []
  fixture.activations.isLoading = false
  fixture.activations.error = null
})

it('uses the stored organization area and rejects Caja in a native Salud profile even with a positive override', () => {
  fixture.area.data!.areaId = 'health'
  fixture.area.data!.defaultModuleIds = ['dashboard', 'staff', 'settings', 'agenda']
  fixture.activations.data = [{ module_id: 'pos', branch_id: 'branch-a', enabled: true }]
  const state = renderHook(() => useOrganizationModules()).result.current
  expect(state.areaId).toBe('health')
  expect(state.getModuleAccess('pos').reason).toBe('area_disabled')
  expect(state.availableModules.map(module => module.id)).toEqual(['dashboard', 'staff', 'settings'])
  expect(state.getModuleAccess('agenda').reason).toBe('not_available_yet')
})

it('preserves existing retail Standard navigation without activation exceptions', () => {
  const state = renderHook(() => useOrganizationModules()).result.current
  expect(state.branchId).toBe('branch-a')
  expect(state.availableModules.map(module => module.id)).toEqual(['dashboard', 'pos', 'inventory', 'customers', 'staff', 'settings'])
  expect(state.getModuleAccess('tables').reason).toBe('not_available_yet')
})

it('uses the compatibility catalog even without one of the three areas', () => {
  fixture.area.data!.areaId = null
  fixture.area.data!.compatibilityMode = true
  fixture.area.data!.defaultModuleIds = ['dashboard', 'pos', 'staff', 'customers', 'settings']
  const state = renderHook(() => useOrganizationModules()).result.current
  expect(state.areaId).toBeNull()
  expect(state.compatibilityMode).toBe(true)
  expect(state.canAccessModule('pos')).toBe(true)
  expect(state.canAccessModule('inventory')).toBe(false)
})

it('removes a branch module when its stored activation is false', () => {
  fixture.activations.data = [{ module_id: 'pos', branch_id: 'branch-a', enabled: false }]
  const state = renderHook(() => useOrganizationModules()).result.current
  expect(state.canAccessModule('pos')).toBe(false)
  expect(state.availableModules.map(module => module.id)).not.toContain('pos')
})

it('honors saved compatibility overrides without bypassing plan restrictions', () => {
  fixture.area.data!.compatibilityMode = true
  fixture.area.data!.defaultModuleIds = ['dashboard', 'pos', 'staff', 'analytics', 'settings']
  fixture.activations.data = [
    { module_id: 'inventory', branch_id: 'branch-a', enabled: true },
    { module_id: 'analytics', branch_id: null, enabled: true },
  ]
  const state = renderHook(() => useOrganizationModules()).result.current
  expect(state.canAccessModule('inventory')).toBe(true)
  expect(state.getModuleAccess('analytics').reason).toBe('plan_disabled')
})

it('blocks all modules when the organization context is missing', () => {
  fixture.area.data = null
  const state = renderHook(() => useOrganizationModules()).result.current
  expect(state.error).toBeInstanceOf(Error)
  expect(state.availableModules).toEqual([])
  expect(state.getModuleAccess('pos').allowed).toBe(false)
})

it('blocks all modules while activation data is loading or fails', () => {
  fixture.activations.isLoading = true
  expect(renderHook(() => useOrganizationModules()).result.current.availableModules).toEqual([])
  fixture.activations.isLoading = false
  fixture.activations.error = new Error('offline')
  const state = renderHook(() => useOrganizationModules()).result.current
  expect(state.error?.message).toBe('offline')
  expect(state.canAccessModule('pos')).toBe(false)
})

it('blocks area defaults when the activation request is paused without data', () => {
  fixture.activations.data = undefined
  fixture.activations.isLoading = false
  const state = renderHook(() => useOrganizationModules()).result.current
  expect(state.error).toBeInstanceOf(Error)
  expect(state.availableModules).toEqual([])
  expect(state.getModuleAccess('pos').reason).toBe('access_unavailable')
})

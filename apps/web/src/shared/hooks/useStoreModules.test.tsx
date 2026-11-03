import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
vi.mock('./useStoreId', () => ({ useStoreId: () => ({ storeId: 'store-1', loading: false }) }))
vi.mock('./useStorePlan', () => ({ useStorePlan: () => ({ data: { business_type: 'tienda_articulos', name: 'Tienda', plans: { name: 'Standard', features: { advanced_analytics: false } }, feature_overrides: {} }, isLoading: false }) }))
vi.mock('../../features/settings/hooks/useStoreSettings', () => ({ useStoreSettings: () => ({ settings: null }) }))
import { useStoreModules } from './useStoreModules'

it('returns only implemented accessible modules', () => {
  const state = renderHook(() => useStoreModules()).result.current
  expect(state.availableModules.map(module => module.id)).toEqual(['dashboard', 'pos', 'inventory', 'customers', 'staff', 'settings'])
  expect(state.getModuleAccess('tables').reason).toBe('not_available_yet')
})

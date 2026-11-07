import { renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  id: { storeId: 'store-1', loading: false },
  query: { data: { business_type: 'tienda_articulos', industry_sub_type: 'ropa_calzado', name: 'Tienda', plans: { name: 'Pro', features: { advanced_analytics: true, max_users: 2 } }, feature_overrides: { max_users: 6 } }, isLoading: false, error: null } as { data: Record<string, unknown>; isLoading: boolean; error: Error | null },
}))
vi.mock('./useStoreId', () => ({ useStoreId: () => fixture.id }))
vi.mock('./useStorePlan', () => ({ useStorePlan: () => fixture.query }))
import { useStoreEntitlements } from './useStoreEntitlements'
import { useRetailSubrubro } from './useRetailSubrubro'

beforeEach(() => {
  fixture.id = { storeId: 'store-1', loading: false }
  fixture.query = { data: { business_type: 'tienda_articulos', industry_sub_type: 'ropa_calzado', name: 'Tienda', plans: { name: 'Pro', features: { advanced_analytics: true, max_users: 2 } }, feature_overrides: { max_users: 6 } }, isLoading: false, error: null }
})

it('derives a canonical profile from the current store fields', () => {
  expect(renderHook(() => useStoreEntitlements()).result.current.profile).toEqual({ familyId: 'retail', categoryId: 'ropa_calzado' })
})
it('merges plan values and commercial overrides once', () => {
  expect(renderHook(() => useStoreEntitlements()).result.current.entitlements.limits.max_users).toBe(6)
})
it('exposes boolean features separately from numeric limits', () => {
  const state = renderHook(() => useStoreEntitlements()).result.current
  expect(state.isFeatureEnabled('advanced_analytics')).toBe(true)
  expect(state.getLimit('max_users')).toBe(6)
  expect(state.isFeatureEnabled('max_users')).toBe(false)
})
it('uses the safe retail/general fallback when store data is malformed', () => {
  fixture.query.data.business_type = 'unrecognized'
  fixture.query.data.industry_sub_type = 'dark_kitchen'
  expect(renderHook(() => useStoreEntitlements()).result.current.profile).toEqual({ familyId: 'retail', categoryId: 'comercio_general' })
})
it('keeps loading true until both tenant and plan reads finish', () => {
  fixture.id.loading = true
  expect(renderHook(() => useStoreEntitlements()).result.current.isLoading).toBe(true)
  fixture.id.loading = false
  fixture.query.isLoading = true
  expect(renderHook(() => useStoreEntitlements()).result.current.isLoading).toBe(true)
})
it('uses general retail settings for a non-retail legacy store', () => {
  fixture.query.data.business_type = 'restaurante'
  fixture.query.data.industry_sub_type = 'ropa_calzado'
  expect(renderHook(() => useRetailSubrubro()).result.current.subType).toBe('comercio_general')
})
it('uses general retail settings until a new category has a dedicated POS preset', () => {
  fixture.query.data.industry_sub_type = 'repuestos'
  const { subType, config } = renderHook(() => useRetailSubrubro()).result.current
  expect(subType).toBe('comercio_general')
  expect(config.code).toBe('comercio_general')
})

import { renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  id: { organizationId: 'store-1', loading: false },
  query: { data: { plan: { name: 'Pro', features: { advanced_analytics: true, max_users: 2 } }, featureOverrides: { max_users: 6 } }, isLoading: false, error: null } as { data: Record<string, unknown>; isLoading: boolean; error: Error | null },
}))
vi.mock('../organizations/useOrganizationId', () => ({ useOrganizationId: () => fixture.id }))
vi.mock('./useOrganizationPlan', () => ({ useOrganizationPlan: () => fixture.query }))
import { useOrganizationEntitlements } from './useOrganizationEntitlements'

beforeEach(() => {
  fixture.id = { organizationId: 'store-1', loading: false }
  fixture.query = { data: { plan: { name: 'Pro', features: { advanced_analytics: true, max_users: 2 } }, featureOverrides: { max_users: 6 } }, isLoading: false, error: null }
})

it('merges plan values and commercial overrides once', () => {
  expect(renderHook(() => useOrganizationEntitlements()).result.current.entitlements.limits.max_users).toBe(6)
})
it('exposes boolean features separately from numeric limits', () => {
  const state = renderHook(() => useOrganizationEntitlements()).result.current
  expect(state.isFeatureEnabled('advanced_analytics')).toBe(true)
  expect(state.getLimit('max_users')).toBe(6)
  expect(state.isFeatureEnabled('max_users')).toBe(false)
})
it('keeps loading true until both tenant and plan reads finish', () => {
  fixture.id.loading = true
  expect(renderHook(() => useOrganizationEntitlements()).result.current.isLoading).toBe(true)
  fixture.id.loading = false
  fixture.query.isLoading = true
  expect(renderHook(() => useOrganizationEntitlements()).result.current.isLoading).toBe(true)
})

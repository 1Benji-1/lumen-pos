import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useRetailSubrubro } from './useRetailSubrubro'

const fixture = vi.hoisted(() => ({
  profile: { businessType: 'tienda_articulos', industrySubType: 'comercio_general' },
}))

vi.mock('../../core/organizations/useOrganizationId', () => ({
  useOrganizationId: () => ({ organizationId: 'org-a', loading: false }),
}))
vi.mock('../../core/subscriptions/useOrganizationPlan', () => ({
  useOrganizationPlan: () => ({ data: fixture.profile, isLoading: false }),
}))

it.each([
  ['restaurante', 'ropa_calzado'],
  ['tienda_articulos', 'repuestos'],
  ['unrecognized', 'dark_kitchen'],
])('uses the general POS preset for %s / %s', (businessType, industrySubType) => {
  fixture.profile = { businessType, industrySubType }
  const { result, unmount } = renderHook(() => useRetailSubrubro())
  expect(result.current.subType).toBe('comercio_general')
  expect(result.current.config.code).toBe('comercio_general')
  unmount()
})

it('keeps the specific preset for a supported retail category', () => {
  fixture.profile = { businessType: 'tienda_articulos', industrySubType: 'ropa_calzado' }
  const { result, unmount } = renderHook(() => useRetailSubrubro())
  expect(result.current.subType).toBe('ropa_calzado')
  unmount()
})

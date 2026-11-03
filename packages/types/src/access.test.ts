import { describe, expect, it } from 'vitest'
import { resolveModuleAccess } from './access'
import { resolveEntitlements } from './entitlements'

const retail = { familyId: 'retail', categoryId: 'comercio_general' } as const

describe('module access precedence', () => {
  it('blocks a planned module even when activated', () => {
    expect(resolveModuleAccess({ profile: retail, moduleId: 'tables', entitlements: resolveEntitlements(), activation: { tables: true } }).reason).toBe('not_available_yet')
  })
  it('blocks a required plan feature before category activation', () => {
    expect(resolveModuleAccess({ profile: retail, moduleId: 'analytics', entitlements: resolveEntitlements({ advanced_analytics: false }), activation: { analytics: true } }).reason).toBe('plan_disabled')
  })
  it('lets activation restore a category-omitted module when the plan grants it', () => {
    expect(resolveModuleAccess({ profile: { familyId: 'services', categoryId: 'barberia_belleza' }, moduleId: 'inventory', entitlements: resolveEntitlements(), activation: { inventory: true } }).allowed).toBe(true)
  })
  it('lets explicit false activation disable a category-default module', () => {
    expect(resolveModuleAccess({ profile: retail, moduleId: 'pos', entitlements: resolveEntitlements(), activation: { pos: false } }).reason).toBe('organization_disabled')
  })
  it('returns permission_denied only after module entitlement succeeds', () => {
    expect(resolveModuleAccess({ profile: retail, moduleId: 'pos', entitlements: resolveEntitlements(), permissionGranted: false }).reason).toBe('permission_denied')
  })
  it('allows the current retail core modules without new activation data', () => {
    for (const moduleId of ['dashboard', 'pos', 'inventory', 'customers', 'staff', 'settings'] as const) {
      expect(resolveModuleAccess({ profile: retail, moduleId, entitlements: resolveEntitlements() }).allowed).toBe(true)
    }
  })
})

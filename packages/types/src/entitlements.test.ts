import { describe, expect, it } from 'vitest'
import { resolveEntitlements } from './entitlements'

describe('plan entitlements', () => {
  it('merges boolean features and positive integer limits by override precedence', () => {
    expect(resolveEntitlements({ advanced_analytics: true, max_users: 2 }, { max_users: 6 })).toEqual({ features: { advanced_analytics: true }, limits: { max_users: 6 } })
  })
  it('lets an explicit false commercial override remove a plan feature', () => {
    expect(resolveEntitlements({ advanced_analytics: true }, { advanced_analytics: false }).features.advanced_analytics).toBe(false)
  })
  it('ignores negative fractional non-finite and wrong-type limits', () => {
    expect(resolveEntitlements({ max_users: -2, max_products: 1.5, max_branches: Infinity, max_storage_mb: '100' }).limits).toEqual({})
  })
  it('does not coerce truthy strings into enabled features', () => {
    expect(resolveEntitlements({ advanced_analytics: 'true' }, { mobile_app: 1 }).features).toEqual({})
  })
})

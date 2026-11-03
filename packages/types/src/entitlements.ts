export type PlanFeatureKey = string
export type PlanLimitKey = 'max_products' | 'max_users' | 'max_cash_registers' | 'max_branches' | 'max_storage_mb'
export interface EffectiveEntitlements {
  features: Readonly<Record<string, boolean>>
  limits: Readonly<Partial<Record<PlanLimitKey, number>>>
}

const LIMIT_KEYS = new Set<string>(['max_products', 'max_users', 'max_cash_registers', 'max_branches', 'max_storage_mb'])

export function resolveEntitlements(planValues?: Record<string, unknown> | null, commercialOverrides?: Record<string, unknown> | null): EffectiveEntitlements {
  const features: Record<string, boolean> = {}
  const limits: Partial<Record<PlanLimitKey, number>> = {}
  for (const values of [planValues, commercialOverrides]) {
    if (!values) continue
    for (const [key, value] of Object.entries(values)) {
      if (LIMIT_KEYS.has(key)) {
        if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) limits[key as PlanLimitKey] = value
      } else if (typeof value === 'boolean') {
        features[key] = value
      }
    }
  }
  return { features, limits }
}

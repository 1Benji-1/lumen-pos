import { resolveEntitlements, resolveLegacyBusinessProfile, type BusinessProfile, type EffectiveEntitlements, type PlanLimitKey } from '@lumen-pos/types'
import { useStoreId } from './useStoreId'
import { useStorePlan } from './useStorePlan'

export interface StoreEntitlementsState {
  profile: BusinessProfile
  entitlements: EffectiveEntitlements
  planName: string
  isFeatureEnabled(feature: string): boolean
  getLimit(limit: PlanLimitKey): number | null
  isLoading: boolean
  error: Error | null
}

export function useStoreEntitlements(): StoreEntitlementsState {
  const { storeId, loading: storeIdLoading } = useStoreId()
  const { data: store, isLoading: storeLoading, error: queryError } = useStorePlan(storeId)
  const profile = resolveLegacyBusinessProfile(store?.business_type, store?.industry_sub_type)
  const plan = store?.plans as { name?: string; features?: Record<string, unknown> } | null | undefined
  const entitlements = resolveEntitlements(plan?.features, store?.feature_overrides as Record<string, unknown> | null | undefined)
  return {
    profile,
    entitlements,
    planName: plan?.name ?? '',
    isFeatureEnabled: feature => entitlements.features[feature] === true,
    getLimit: limit => entitlements.limits[limit] ?? null,
    isLoading: storeIdLoading || storeLoading,
    error: queryError instanceof Error ? queryError : queryError ? new Error(String(queryError)) : null,
  }
}

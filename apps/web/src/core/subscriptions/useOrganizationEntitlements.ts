import { resolveEntitlements, type EffectiveEntitlements, type PlanLimitKey } from '@lumen-pos/types'
import { useOrganizationId } from '../organizations/useOrganizationId'
import { useOrganizationPlan } from './useOrganizationPlan'

export interface OrganizationEntitlementsState {
  entitlements: EffectiveEntitlements
  planName: string
  isFeatureEnabled(feature: string): boolean
  getLimit(limit: PlanLimitKey): number | null
  isLoading: boolean
  error: Error | null
}

export function useOrganizationEntitlements(): OrganizationEntitlementsState {
  const { organizationId, loading: organizationIdLoading } = useOrganizationId()
  const { data: organizationPlan, isLoading: planLoading, error: queryError } = useOrganizationPlan(organizationId)
  const plan = organizationPlan?.plan
  const entitlements = resolveEntitlements(
    plan?.features as Record<string, unknown> | null | undefined,
    organizationPlan?.featureOverrides as Record<string, unknown> | null | undefined,
  )
  return {
    entitlements,
    planName: plan?.name ?? '',
    isFeatureEnabled: feature => entitlements.features[feature] === true,
    getLimit: limit => entitlements.limits[limit] ?? null,
    isLoading: organizationIdLoading || planLoading,
    error: queryError instanceof Error ? queryError : queryError ? new Error(String(queryError)) : null,
  }
}

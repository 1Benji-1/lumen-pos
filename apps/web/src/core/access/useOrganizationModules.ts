import { useOrganizationId } from '../organizations/useOrganizationId'
import { useOrganizationPlan } from '../subscriptions/useOrganizationPlan'
import { useOrganizationSettings } from '../configuration/useOrganizationSettings'
import { useOrganizationEntitlements } from '../subscriptions/useOrganizationEntitlements'
import { usePrimaryBranch } from './legacy/usePrimaryBranch'
import { useModuleActivations } from './legacy/useModuleActivations'
import {
  MODULE_REGISTRY,
  resolveModuleAccess,
  resolveStoredBusinessProfile,
  resolveStoredModuleActivation,
  type ModuleDefinition,
  type ModuleId,
} from '@lumen-pos/types'

export function useOrganizationModules() {
  const { organizationId, loading: organizationIdLoading, error: organizationIdError } = useOrganizationId()
  const { data: organization, isLoading: planLoading, error: planError } = useOrganizationPlan(organizationId)
  const { settings } = useOrganizationSettings(organizationId)
  const { entitlements, planName, isLoading: entitlementsLoading, error: entitlementsError } = useOrganizationEntitlements()
  const { data: branch, isLoading: branchLoading, error: branchError } = usePrimaryBranch(organizationId)
  const branchId = branch?.id ?? null
  const { data: activationRows, isLoading: activationLoading, error: activationError } = useModuleActivations(organizationId, branchId)
  const profile = resolveStoredBusinessProfile(branch?.category_id)
  const isLoading = organizationIdLoading || planLoading || entitlementsLoading || branchLoading || activationLoading
  const rawError = organizationIdError || planError || entitlementsError || branchError || activationError
  const error = rawError instanceof Error ? rawError : rawError ? new Error(String(rawError))
    : !isLoading && !organizationId ? new Error('No se encontró la organización del usuario.')
    : !isLoading && !profile ? new Error('No se pudo comprobar la sucursal principal.')
    : !isLoading && !activationRows ? new Error('No se pudieron comprobar las activaciones de módulos.')
    : null
  const accessUnavailable = isLoading || !!error || !branchId || !profile || !activationRows
  const activation = branchId && activationRows
    ? resolveStoredModuleActivation(activationRows.map(row => ({ moduleId: row.module_id, branchId: row.branch_id, enabled: row.enabled })), branchId)
    : {}

  function getModuleAccess(moduleId: ModuleId) {
    if (accessUnavailable || !profile) {
      return { allowed: false, reason: 'access_unavailable' as const, module: MODULE_REGISTRY[moduleId] }
    }
    return resolveModuleAccess({ profile, moduleId, entitlements, activation })
  }
  const availableModules: ModuleDefinition[] = Object.values(MODULE_REGISTRY).filter(mod => getModuleAccess(mod.id).allowed)

  function canAccessModule(moduleId: ModuleId): boolean {
    return getModuleAccess(moduleId).allowed
  }

  // Priorizar el nombre comercial configurado por el usuario en Ajustes sobre el nombre técnico inicial
  const effectiveOrganizationName = settings?.commercial_name?.trim() || organization?.name || ''

  return {
    organizationId,
    branchId,
    organizationName: effectiveOrganizationName,
    profile,
    planName,
    availableModules,
    getModuleAccess,
    canAccessModule,
    isLoading,
    error,
  }
}

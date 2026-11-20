import { useOrganizationId } from '../organizations/useOrganizationId'
import { useOrganizationPlan } from '../subscriptions/useOrganizationPlan'
import { useOrganizationSettings } from '../configuration/useOrganizationSettings'
import { useOrganizationEntitlements } from '../subscriptions/useOrganizationEntitlements'
import { useOrganizationArea } from './useOrganizationArea'
import { useModuleActivations } from './legacy/useModuleActivations'
import {
  MODULE_REGISTRY,
  resolveAreaModuleAccess,
  resolveStoredModuleActivation,
  type ModuleDefinition,
  type ModuleId,
} from '@lumen-pos/types'

export function useOrganizationModules() {
  const { organizationId, loading: organizationIdLoading, error: organizationIdError } = useOrganizationId()
  const { data: organization, isLoading: planLoading, error: planError } = useOrganizationPlan(organizationId)
  const { settings } = useOrganizationSettings(organizationId)
  const { entitlements, planName, isLoading: entitlementsLoading, error: entitlementsError } = useOrganizationEntitlements()
  const { data: area, isLoading: areaLoading, error: areaError } = useOrganizationArea(organizationId)
  const branchId = area?.branchId ?? null
  const { data: activationRows, isLoading: activationLoading, error: activationError } = useModuleActivations(organizationId, branchId)
  const isLoading = organizationIdLoading || planLoading || entitlementsLoading || areaLoading || activationLoading
  const rawError = organizationIdError || planError || entitlementsError || areaError || activationError
  const error = rawError instanceof Error ? rawError : rawError ? new Error(String(rawError))
    : !isLoading && !organizationId ? new Error('No se encontró la organización del usuario.')
    : !isLoading && !area ? new Error('No se pudo comprobar el área de la organización.')
    : !isLoading && !activationRows ? new Error('No se pudieron comprobar las activaciones de módulos.')
    : null
  const accessUnavailable = isLoading || !!error || !branchId || !area || !activationRows
  const activation = branchId && activationRows
    ? resolveStoredModuleActivation(activationRows.map(row => ({ moduleId: row.module_id, branchId: row.branch_id, enabled: row.enabled })), branchId)
    : {}

  function getModuleAccess(moduleId: ModuleId) {
    if (accessUnavailable || !area) {
      return { allowed: false, reason: 'access_unavailable' as const, module: MODULE_REGISTRY[moduleId] }
    }
    return resolveAreaModuleAccess({
      moduleId, entitlements, activation,
      defaultModuleIds: area.defaultModuleIds,
      compatibilityMode: area.compatibilityMode,
    })
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
    areaId: area?.areaId ?? null,
    compatibilityMode: area?.compatibilityMode ?? false,
    defaultModuleIds: area?.defaultModuleIds ?? [],
    planName,
    availableModules,
    getModuleAccess,
    canAccessModule,
    isLoading,
    error,
  }
}

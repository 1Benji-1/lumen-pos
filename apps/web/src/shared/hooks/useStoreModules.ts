import { useStoreId } from './useStoreId'
import { useStorePlan } from './useStorePlan'
import { useStoreSettings } from '../../features/settings/hooks/useStoreSettings'
import { useStoreEntitlements } from './useStoreEntitlements'
import { usePrimaryBranch } from './usePrimaryBranch'
import { useModuleActivations } from './useModuleActivations'
import {
  MODULE_REGISTRY,
  resolveModuleAccess,
  resolveStoredBusinessProfile,
  resolveStoredModuleActivation,
  type BusinessType,
  type ModuleDefinition,
  type ModuleId,
} from '@lumen-pos/types'

export function useStoreModules() {
  const { storeId, loading: storeIdLoading, error: storeIdError } = useStoreId()
  const { data: store, isLoading: storeLoading, error: storeError } = useStorePlan(storeId)
  const { settings } = useStoreSettings(storeId)
  const { entitlements, planName, isLoading: entitlementsLoading, error: entitlementsError } = useStoreEntitlements()
  const { data: branch, isLoading: branchLoading, error: branchError } = usePrimaryBranch(storeId)
  const branchId = branch?.id ?? null
  const { data: activationRows, isLoading: activationLoading, error: activationError } = useModuleActivations(storeId, branchId)
  const profile = resolveStoredBusinessProfile(branch?.category_id)
  const isLoading = storeIdLoading || storeLoading || entitlementsLoading || branchLoading || activationLoading
  const rawError = storeIdError || storeError || entitlementsError || branchError || activationError
  const error = rawError instanceof Error ? rawError : rawError ? new Error(String(rawError))
    : !isLoading && !storeId ? new Error('No se encontró la tienda del usuario.')
    : !isLoading && !profile ? new Error('No se pudo comprobar la sucursal principal.')
    : !isLoading && !activationRows ? new Error('No se pudieron comprobar las activaciones de módulos.')
    : null
  const accessUnavailable = isLoading || !!error || !branchId || !profile || !activationRows
  const activation = branchId && activationRows
    ? resolveStoredModuleActivation(activationRows.map(row => ({ moduleId: row.module_id, branchId: row.branch_id, enabled: row.enabled })), branchId)
    : {}

  const businessType: BusinessType = store?.business_type ?? 'tienda_articulos'
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
  const effectiveStoreName = settings?.commercial_name?.trim() || store?.name || ''

  return {
    storeId,
    branchId,
    storeName: effectiveStoreName,
    businessType,
    profile,
    planName,
    availableModules,
    getModuleAccess,
    canAccessModule,
    isLoading,
    error,
  }
}

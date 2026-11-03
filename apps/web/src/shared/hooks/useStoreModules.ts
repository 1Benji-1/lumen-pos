import { useStoreId } from './useStoreId'
import { useStorePlan } from './useStorePlan'
import { useStoreSettings } from '../../features/settings/hooks/useStoreSettings'
import { useStoreEntitlements } from './useStoreEntitlements'
import {
  MODULE_REGISTRY,
  resolveModuleAccess,
  type BusinessType,
  type ModuleDefinition,
  type ModuleId,
} from '@lumen-pos/types'

export function useStoreModules() {
  const { storeId, loading: storeIdLoading } = useStoreId()
  const { data: store, isLoading: storeLoading } = useStorePlan(storeId)
  const { settings } = useStoreSettings(storeId)
  const { profile, entitlements, planName, isLoading: entitlementsLoading, error } = useStoreEntitlements()

  const businessType: BusinessType = store?.business_type ?? 'tienda_articulos'
  function getModuleAccess(moduleId: ModuleId) {
    return resolveModuleAccess({ profile, moduleId, entitlements })
  }
  const availableModules: ModuleDefinition[] = Object.values(MODULE_REGISTRY).filter(mod => getModuleAccess(mod.id).allowed)

  function canAccessModule(moduleId: ModuleId): boolean {
    return getModuleAccess(moduleId).allowed
  }

  // Priorizar el nombre comercial configurado por el usuario en Ajustes sobre el nombre técnico inicial
  const effectiveStoreName = settings?.commercial_name?.trim() || store?.name || ''

  return {
    storeId,
    storeName: effectiveStoreName,
    businessType,
    profile,
    planName,
    availableModules,
    getModuleAccess,
    canAccessModule,
    isLoading: storeIdLoading || storeLoading || entitlementsLoading,
    error,
  }
}

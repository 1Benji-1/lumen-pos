import { useStoreId } from './useStoreId'
import { useStorePlan } from './useStorePlan'
import { useStoreSettings } from '../../features/settings/hooks/useStoreSettings'
import {
  getModulesForBusinessType,
  isModuleAllowedForBusinessType,
  isModuleAccessible,
  type BusinessType,
  type ModuleDefinition,
  type ModuleId,
} from '@lumen-pos/types'

export function useStoreModules() {
  const { storeId, loading: storeIdLoading } = useStoreId()
  const { data: store, isLoading: storeLoading } = useStorePlan(storeId)
  const { settings } = useStoreSettings(storeId)

  const businessType: BusinessType = store?.business_type ?? 'tienda_articulos'
  const planFeatures = ((store?.plans as any)?.features as Record<string, boolean> | undefined) ?? {}
  const overrides = (store?.feature_overrides as Record<string, boolean> | null) ?? {}
  const effectiveFeatures: Record<string, boolean> = { ...planFeatures, ...overrides }

  const availableModules: ModuleDefinition[] = getModulesForBusinessType(businessType).filter((mod) =>
    isModuleAccessible({
      businessType,
      moduleId: mod.id,
      effectiveFeatures,
    })
  )

  function canAccessModule(moduleId: ModuleId): boolean {
    return isModuleAccessible({
      businessType,
      moduleId,
      effectiveFeatures,
    })
  }

  function isModuleAllowedInBusinessType(moduleId: ModuleId): boolean {
    return isModuleAllowedForBusinessType(businessType, moduleId)
  }

  // Priorizar el nombre comercial configurado por el usuario en Ajustes sobre el nombre técnico inicial
  const effectiveStoreName = settings?.commercial_name?.trim() || store?.name || ''

  return {
    storeId,
    storeName: effectiveStoreName,
    businessType,
    planName: (store?.plans as any)?.name ?? '',
    availableModules,
    canAccessModule,
    isModuleAllowedInBusinessType,
    isLoading: storeIdLoading || storeLoading,
  }
}

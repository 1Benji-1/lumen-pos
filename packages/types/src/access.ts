import type { BusinessProfile } from './commerce'
import { getDefaultModuleIds, MODULE_REGISTRY, type ModuleDefinition, type ModuleId } from './modules'
import type { EffectiveEntitlements } from './entitlements'

export type ModuleActivation = Partial<Record<ModuleId, boolean>>
export interface StoredModuleActivation { moduleId: string; branchId: string | null; enabled: boolean }
export type ModuleAccessReason = 'allowed' | 'not_available_yet' | 'plan_disabled' | 'category_disabled' | 'area_disabled' | 'organization_disabled' | 'permission_denied' | 'access_unavailable'
export interface ModuleAccessResult { allowed: boolean; reason: ModuleAccessReason; module: ModuleDefinition }
export interface ModuleAccessInput {
  profile: BusinessProfile
  moduleId: ModuleId
  entitlements: EffectiveEntitlements
  activation?: ModuleActivation
  permissionGranted?: boolean
}

export function resolveStoredModuleActivation(rows: readonly StoredModuleActivation[], branchId: string): ModuleActivation {
  const activation: ModuleActivation = {}
  for (const row of rows) {
    if (!Object.hasOwn(MODULE_REGISTRY, row.moduleId)) continue
    const moduleId = row.moduleId as ModuleId
    const scope = MODULE_REGISTRY[moduleId].scope
    if ((scope === 'organization' && row.branchId === null) || (scope === 'branch' && row.branchId === branchId)) {
      activation[moduleId] = row.enabled
    }
  }
  return activation
}

export function resolveModuleAccess({ profile, moduleId, entitlements, activation, permissionGranted = true }: ModuleAccessInput): ModuleAccessResult {
  return resolveCatalogAccess({
    defaultModuleIds: getDefaultModuleIds(profile.categoryId),
    moduleId, entitlements, activation, permissionGranted,
    compatibilityMode: true,
    outsideCatalogReason: 'category_disabled',
  })
}

type AreaAccessInput = Omit<ModuleAccessInput, 'profile'> & {
  defaultModuleIds: readonly ModuleId[]
  compatibilityMode: boolean
}

export function resolveAreaModuleAccess(input: AreaAccessInput): ModuleAccessResult {
  return resolveCatalogAccess({ ...input, outsideCatalogReason: 'area_disabled' })
}

function resolveCatalogAccess({
  defaultModuleIds, moduleId, entitlements, activation, permissionGranted = true,
  compatibilityMode, outsideCatalogReason,
}: AreaAccessInput & { outsideCatalogReason: 'area_disabled' | 'category_disabled' }): ModuleAccessResult {
  const module = MODULE_REGISTRY[moduleId]
  const result = (reason: ModuleAccessReason): ModuleAccessResult => ({ allowed: reason === 'allowed', reason, module })
  if (module.implementationStatus !== 'available') return result('not_available_yet')
  const included = defaultModuleIds.includes(moduleId)
  if (!compatibilityMode && !included) return result(outsideCatalogReason)
  if (module.requiredFeature && entitlements.features[module.requiredFeature] !== true) return result('plan_disabled')
  if (activation?.[moduleId] === false) return result('organization_disabled')
  if (activation?.[moduleId] !== true && !included) return result(outsideCatalogReason)
  if (!permissionGranted) return result('permission_denied')
  return result('allowed')
}

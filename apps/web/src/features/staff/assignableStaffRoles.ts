import type { AreaId, UserRole } from '@lumen-pos/types'

export function getAssignableStaffRoles(isOwner: boolean, areaId: AreaId | null, compatibilityMode: boolean): readonly UserRole[] {
  if (areaId === 'health' && !compatibilityMode) return isOwner ? ['admin', 'owner'] : []
  return isOwner ? ['cashier', 'stock_clerk', 'admin', 'owner'] : ['cashier', 'stock_clerk']
}

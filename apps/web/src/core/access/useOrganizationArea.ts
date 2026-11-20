import { useQuery } from '@tanstack/react-query'
import { isAreaId, MODULE_REGISTRY, type ModuleId } from '@lumen-pos/types'
import { supabase } from '../../shared/lib/supabaseClient'

export function useOrganizationArea(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizationArea', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_organization_area_context').maybeSingle()
      if (error) throw error
      if (!data || data.store_id !== organizationId) {
        throw new Error('No se pudo comprobar el área de la organización.')
      }
      const areaId = data.area_id !== null && isAreaId(data.area_id) ? data.area_id : null
      if (areaId !== data.area_id || (!areaId && !data.compatibility_mode)) {
        throw new Error('El área de la organización no es válida.')
      }
      return {
        areaId,
        branchId: data.branch_id,
        defaultModuleIds: data.default_module_ids.filter((id): id is ModuleId => Object.hasOwn(MODULE_REGISTRY, id)),
        compatibilityMode: data.compatibility_mode,
      }
    },
    enabled: !!organizationId,
  })
}

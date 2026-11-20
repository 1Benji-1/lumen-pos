import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../shared/lib/supabaseClient'

export function useModuleActivations(organizationId: string | null, branchId: string | null) {
  return useQuery({
    queryKey: ['moduleActivations', organizationId, branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_activations')
        .select('module_id, branch_id, enabled')
        .eq('store_id', organizationId!)
      if (error) throw error
      return data.filter(row => row.branch_id === null || row.branch_id === branchId)
    },
    enabled: !!organizationId && !!branchId,
  })
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useModuleActivations(storeId: string | null, branchId: string | null) {
  return useQuery({
    queryKey: ['moduleActivations', storeId, branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_activations')
        .select('module_id, branch_id, enabled')
        .eq('store_id', storeId!)
      if (error) throw error
      return data.filter(row => row.branch_id === null || row.branch_id === branchId)
    },
    enabled: !!storeId && !!branchId,
  })
}

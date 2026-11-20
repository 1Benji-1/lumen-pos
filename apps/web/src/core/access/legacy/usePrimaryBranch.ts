import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../shared/lib/supabaseClient'

export function usePrimaryBranch(organizationId: string | null) {
  return useQuery({
    queryKey: ['primaryBranch', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, store_id, name, category_id, is_primary')
        .eq('store_id', organizationId!)
        .eq('is_primary', true)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!organizationId,
  })
}

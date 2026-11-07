import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function usePrimaryBranch(storeId: string | null) {
  return useQuery({
    queryKey: ['primaryBranch', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, store_id, name, category_id, is_primary')
        .eq('store_id', storeId!)
        .eq('is_primary', true)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!storeId,
  })
}

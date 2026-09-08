import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useStorePlan(storeId: string | null) {
  return useQuery({
    queryKey: ['storePlan', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('subscription_status, trial_ends_at, feature_overrides, plans(code, name, features)')
        .eq('id', storeId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!storeId,
  })
}
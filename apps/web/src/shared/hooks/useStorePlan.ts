import { useQuery } from '@tanstack/react-query'
import type { BusinessType, RetailSubType } from '@lumen-pos/types'
import { supabase } from '../lib/supabaseClient'

export function useStorePlan(storeId: string | null) {
  return useQuery({
    queryKey: ['storePlan', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, subscription_status, trial_ends_at, feature_overrides, business_type, industry_sub_type, plans(code, name, features)')
        .eq('id', storeId!)
        .single()
      if (error) throw error
      return {
        ...data,
        business_type: (data.business_type as BusinessType) ?? 'tienda_articulos',
        industry_sub_type: (data.industry_sub_type as RetailSubType) ?? 'comercio_general',
      }
    },
    enabled: !!storeId,
  })
}
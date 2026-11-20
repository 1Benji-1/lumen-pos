import { useQuery } from '@tanstack/react-query'
import type { BusinessType, RetailSubType } from '@lumen-pos/types'
import { supabase } from '../../shared/lib/supabaseClient'

export function useOrganizationPlan(organizationId: string | null) {
  return useQuery({
    queryKey: ['storePlan', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, subscription_status, trial_ends_at, feature_overrides, business_type, industry_sub_type, plans(code, name, features)')
        .eq('id', organizationId!)
        .single()
      if (error) throw error
      return {
        id: data.id,
        name: data.name,
        subscriptionStatus: data.subscription_status,
        trialEndsAt: data.trial_ends_at,
        featureOverrides: data.feature_overrides,
        businessType: (data.business_type as BusinessType) ?? 'tienda_articulos',
        industrySubType: (data.industry_sub_type as RetailSubType) ?? 'comercio_general',
        plan: data.plans,
      }
    },
    enabled: !!organizationId,
  })
}

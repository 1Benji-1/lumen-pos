import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabaseClient'

export function useOrganizationSubscription(organizationId: string | null) {
  return useQuery({
    queryKey: ['storeSubscriptionStatus', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('subscription_ends_at, grace_period_days')
        .eq('id', organizationId!)
        .single()
      if (error) throw error
      if (!data) throw new Error('No se pudo verificar la suscripción.')
      return { endsAt: data.subscription_ends_at, graceDays: data.grace_period_days }
    },
    enabled: !!organizationId,
  })
}

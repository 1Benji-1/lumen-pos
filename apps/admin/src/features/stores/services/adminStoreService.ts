import { supabase } from '../../../shared/lib/supabaseClient'

export async function createStore(params: {
  email: string
  storeName: string
  fullName: string
  planCode: 'standard' | 'pro' | 'enterprise'
  subscriptionStatus: 'trialing' | 'active'
  billingCycle?: 'monthly' | 'semiannual' | 'annual'
}) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if (!token) throw new Error('No hay sesión activa')

  const { data, error } = await supabase.functions.invoke('create-store', {
    body: params,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (error) throw error
  return data
}
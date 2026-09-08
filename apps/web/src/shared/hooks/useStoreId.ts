import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../../features/auth/hooks/useAuth'

export function useStoreId() {
  const { session } = useAuth()
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    supabase
      .from('users')
      .select('store_id')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setStoreId(data?.store_id ?? null)
        setLoading(false)
      })
  }, [session])

  return { storeId, loading }
}
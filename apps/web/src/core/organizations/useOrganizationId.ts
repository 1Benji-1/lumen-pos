import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'
import { useAuth } from '../auth/hooks/useAuth'

export function useOrganizationId() {
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user?.id ?? null
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ session: typeof session; revision: number; organizationId: string | null; error: Error | null; loading: boolean }>({ session: null, revision: -1, organizationId: null, error: null, loading: false })
  const retry = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    if (authLoading) return
    if (!userId) return
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase.from('users').select('store_id, is_active').eq('id', userId).single()
        if (error) throw new Error(error.message)
        if (!data?.store_id) throw new Error('No se encontró el perfil de tu organización.')
        if (data.is_active !== true) throw new Error('Tu cuenta está desactivada. Contacta al propietario.')
        if (!cancelled) setState({ session, revision, organizationId: data.store_id, error: null, loading: false })
      } catch (error) {
        if (!cancelled) setState({ session, revision, organizationId: null, error: error instanceof Error ? error : new Error('No se pudo verificar el perfil de tu organización.'), loading: false })
      }
    })()
    return () => { cancelled = true }
  }, [session, userId, authLoading, revision])

  const current = !!userId && state.session === session && state.revision === revision && !authLoading
  return {
    organizationId: current ? state.organizationId : null,
    loading: authLoading || (!!userId && !current),
    error: current ? state.error : null,
    retry,
  }
}

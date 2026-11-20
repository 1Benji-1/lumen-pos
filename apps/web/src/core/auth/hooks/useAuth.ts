import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../../shared/lib/supabaseClient'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    let eventReceived = false
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      eventReceived = true
      if (!active) return
      setSession(newSession)
      setError(null)
      setLoading(false)
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || eventReceived) return
      if (error) throw error
      setSession(data.session)
      setError(null)
      setLoading(false)
    }).catch(error => {
      if (!active || eventReceived) return
      setSession(null)
      setError(error instanceof Error ? error : new Error('No se pudo cargar la sesión.'))
      setLoading(false)
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  return { session, loading, error, isAuthenticated: !!session }
}

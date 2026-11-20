import { useEffect, useState, useCallback, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { getMfaAssuranceLevel, listMfaFactors } from '../../features/auth/services/authService'

type AuthState = {
  session: Session | null
  loading: boolean
  mfaLevel: 'aal1' | 'aal2' | null
  hasEnrolledMfa: boolean
  verifiedFactorId: string | null
  mfaError: Error | null
}
const signedOut = { session: null, loading: false, mfaLevel: null, hasEnrolledMfa: false, verifiedFactorId: null, mfaError: null } as const

export function useAuth() {
  const [state, setState] = useState<AuthState>({ ...signedOut, loading: true })
  const mounted = useRef(false)
  const version = useRef(0)

  const resolveMfa = useCallback(async (session: Session | null, request: number) => {
    if (!session) {
      if (mounted.current && request === version.current) setState(signedOut)
      return
    }
    try {
      const aal = await getMfaAssuranceLevel()
      const factors = await listMfaFactors()
      if (!aal || !['aal1', 'aal2'].includes(aal.currentLevel ?? '') || !factors) throw new Error('No se pudo verificar la seguridad de la sesión.')
      const verifiedTotp = (factors.totp || []).find(factor => factor.status === 'verified')
      const enrolled = (factors.all || factors.totp || []).some(factor => factor.status === 'verified')
      if (mounted.current && request === version.current) setState({ session, loading: false, mfaLevel: aal.currentLevel as 'aal1' | 'aal2', hasEnrolledMfa: enrolled, verifiedFactorId: verifiedTotp?.id ?? null, mfaError: null })
    } catch (error) {
      // Unknown factor state must never be interpreted as an account without MFA.
      if (mounted.current && request === version.current) setState({ session, loading: false, mfaLevel: null, hasEnrolledMfa: true, verifiedFactorId: null, mfaError: error instanceof Error ? error : new Error('No se pudo verificar MFA. Intenta nuevamente.') })
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    let eventReceived = false
    const invalidate = () => { version.current += 1 }
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const applySession = (session: Session | null) => {
      const request = ++version.current
      setState(session ? { session, loading: true, mfaLevel: null, hasEnrolledMfa: true, verifiedFactorId: null, mfaError: null } : signedOut)
      if (!session) return
      // Auth listeners run under Supabase's lock. Defer Auth API work until
      // the listener has returned and the lock has been released.
      const timer = setTimeout(() => { timers.delete(timer); void resolveMfa(session, request) }, 0)
      timers.add(timer)
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      eventReceived = true
      applySession(session)
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted.current || eventReceived) return
      if (error) throw error
      applySession(data.session)
    }).catch(error => {
      if (!mounted.current || eventReceived) return
      ++version.current
      setState({ ...signedOut, mfaError: error instanceof Error ? error : new Error('No se pudo cargar la sesión.') })
    })
    return () => {
      mounted.current = false
      invalidate()
      timers.forEach(clearTimeout)
      listener.subscription.unsubscribe()
    }
  }, [resolveMfa])

  const refreshMfaStatus = useCallback(async () => {
    const request = ++version.current
    setState(current => ({ ...current, loading: true, mfaLevel: null, hasEnrolledMfa: Boolean(current.session), mfaError: null }))
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (mounted.current && request === version.current) await resolveMfa(data.session, request)
    } catch (error) {
      if (mounted.current && request === version.current) setState(current => ({ ...current, loading: false, mfaLevel: null, hasEnrolledMfa: true, mfaError: error instanceof Error ? error : new Error('No se pudo verificar MFA.') }))
    }
  }, [resolveMfa])

  return { ...state, isAuthenticated: !!state.session, refreshMfaStatus }
}

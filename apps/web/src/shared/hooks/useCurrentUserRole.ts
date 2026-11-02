import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { type UserRole, type Permission, hasPermission as checkRolePermission, ROLE_DEFINITIONS } from '@lumen-pos/types'

export interface UserRoleState {
  role: UserRole | null
  fullName: string | null
  email: string | null
  isActive: boolean
  loading: boolean
  error: Error | null
  retry: () => void
  isOwner: boolean
  isAdminOrOwner: boolean
  permissions: Permission[]
  hasPermission: (permission: Permission) => boolean
}

type ProfileState = { session: Session | null; revision: number; role: UserRole | null; fullName: string | null; email: string | null; isActive: boolean; loading: boolean; error: Error | null }
const emptyProfile = { role: null, fullName: null, email: null, isActive: false } as const

export function useCurrentUserRole(): UserRoleState {
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user?.id ?? null
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(value => value + 1), [])
  const [state, setState] = useState<ProfileState>({ session: null, revision: -1, ...emptyProfile, loading: false, error: null })

  useEffect(() => {
    if (authLoading) return
    if (!userId) return
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase.from('users').select('role, full_name, email, is_active').eq('id', userId).single()
        if (error) throw new Error(error.message)
        if (!data?.role || !Object.prototype.hasOwnProperty.call(ROLE_DEFINITIONS, data.role)) throw new Error('El perfil no tiene un rol válido.')
        if (data.is_active !== true) throw new Error('Tu cuenta está desactivada.')
        if (!cancelled) setState({ session, revision, role: data.role as UserRole, fullName: data.full_name ?? session?.user.user_metadata?.full_name ?? null, email: data.email ?? session?.user.email ?? null, isActive: true, loading: false, error: null })
      } catch (error) {
        if (!cancelled) setState({ session, revision, ...emptyProfile, loading: false, error: error instanceof Error ? error : new Error('No se pudo verificar el rol del usuario.') })
      }
    })()
    return () => { cancelled = true }
  }, [session, userId, authLoading, revision])

  const current = !!userId && state.session === session && state.revision === revision && !authLoading
  const { role, fullName, email, isActive } = current ? state : emptyProfile
  const permissions = role && isActive ? ROLE_DEFINITIONS[role].permissions : []
  return {
    role, fullName, email, isActive,
    loading: authLoading || (!!userId && !current),
    error: current ? state.error : null,
    retry,
    isOwner: isActive && role === 'owner',
    isAdminOrOwner: isActive && (role === 'owner' || role === 'admin'),
    permissions,
    hasPermission: permission => Boolean(role && isActive && checkRolePermission(role, permission)),
  }
}

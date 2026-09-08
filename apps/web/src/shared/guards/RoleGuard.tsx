import { Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../../features/auth/hooks/useAuth'

type Role = 'owner' | 'admin' | 'cashier'

export function RoleGuard({ allowedRoles }: { allowedRoles: Role[] }) {
  const { session } = useAuth()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return

    supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setRole((data?.role as Role) ?? null)
        setLoading(false)
      })
  }, [session])

  if (loading) return <div className="text-white p-8">Cargando...</div>

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
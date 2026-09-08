import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function SuperAdminGuard() {
  const { session, loading, isAuthenticated } = useAuth()

  if (loading) return <div className="text-white p-8">Cargando...</div>

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const isSuperAdmin = session?.user?.app_metadata?.is_super_admin === true

  if (!isSuperAdmin) {
    return (
      <div className="text-white p-8">
        No tienes permisos para acceder a este panel.
      </div>
    )
  }

  return <Outlet />
}
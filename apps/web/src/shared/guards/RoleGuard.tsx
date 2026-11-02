import { Navigate, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import { type UserRole, type Permission, getDefaultRouteForRole } from '@lumen-pos/types'
import { useCurrentUserRole } from '../hooks/useCurrentUserRole'

import { LoadingScreen } from '../components/LoadingScreen'

interface RoleGuardProps {
  allowedRoles?: UserRole[]
  requiredPermission?: Permission
  children?: ReactNode
}

export function RoleGuard({ allowedRoles, requiredPermission, children }: RoleGuardProps) {
  const { role, isActive, loading, hasPermission } = useCurrentUserRole()

  if (loading) {
    return <LoadingScreen fullScreen message="Verificando permisos de acceso..." />
  }

  // Si el usuario está inactivo o no tiene rol
  if (!role || !isActive) {
    return <Navigate to="/login" replace />
  }

  const fallbackRoute = getDefaultRouteForRole(role)

  // Validación por rol directo si se especificó
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={fallbackRoute} replace />
  }

  // Validación por permiso si se especificó
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={fallbackRoute} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
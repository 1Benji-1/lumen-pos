import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useStorePlan } from '../../shared/hooks/useStorePlan'

export function ProtectedRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { storeId, loading: storeIdLoading } = useStoreId()
  const { data: storePlan, isLoading: planLoading } = useStorePlan(storeId)

  const stillResolving =
    authLoading ||
    storeIdLoading ||
    (isAuthenticated && (!storeId || planLoading || !storePlan))

  if (stillResolving) {
    return <div className="text-white p-8">Cargando...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const status = storePlan?.subscription_status
  const trialEndsAt = storePlan?.trial_ends_at ? new Date(storePlan.trial_ends_at) : null
  const trialStillValid = status === 'trialing' && trialEndsAt !== null && trialEndsAt > new Date()
  const hasAccess = status === 'active' || trialStillValid

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-center p-8">
        <div>
          <p className="text-3xl mb-3">🔒</p>
          <p className="font-bold text-lg mb-2">Tu acceso está suspendido</p>
          <p className="text-slate-400 text-sm">
            {status === 'trialing'
              ? 'Tu período de prueba gratuita terminó.'
              : 'Tu suscripción no está activa.'}{' '}
            Contacta al soporte para reactivar tu cuenta.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
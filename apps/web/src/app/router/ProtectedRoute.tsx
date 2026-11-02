import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useStorePlan } from '../../shared/hooks/useStorePlan'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import { supabase } from '../../shared/lib/supabaseClient'
import {
  useOfflineSalesCount,
  syncOfflineSales,
} from '../../features/pos/services/offlinePosService'

export function ProtectedRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { storeId, loading: storeIdLoading, error: profileError, retry: retryProfile } = useStoreId()
  const { data: storePlan, isLoading: planLoading, isError: planError, refetch: retryPlan } = useStorePlan(storeId)

  const { data: storeSubscription, isLoading: subLoading, isError: subError, refetch: retrySubscription } = useQuery({
    queryKey: ['storeSubscriptionStatus', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('subscription_ends_at, grace_period_days')
        .eq('id', storeId!)
        .single()
      if (error) throw error
      if (!data) throw new Error('No se pudo verificar la suscripción.')
      return data
    },
    enabled: !!storeId,
  })

  const offlineSalesCount = useOfflineSalesCount(storeId)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; isError?: boolean } | null>(null)

  const stillResolving =
    authLoading ||
    storeIdLoading ||
    (isAuthenticated && !!storeId && (planLoading || subLoading))

  if (stillResolving) {
    return <LoadingScreen fullScreen message="Verificando acceso a tu tienda..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (profileError || !storeId || planError || subError || !storePlan || !storeSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E8EDDF] text-[#242423] text-center p-6">
        <div role="alert" className="max-w-md w-full bg-white border border-[#CFDBD5] rounded-xl p-8 shadow-sm">
          <p className="font-bold text-lg mb-2">No se pudo verificar el acceso</p>
          <p className="text-[#5A5D5A] text-sm mb-6">{profileError?.message || 'No se pudo consultar el perfil o la suscripción de tu tienda. Intenta nuevamente.'}</p>
          <button type="button" onClick={() => { retryProfile(); if (storeId) { void retryPlan(); void retrySubscription() } }} className="w-full px-4 py-2.5 rounded-lg bg-[#242423] text-white text-xs font-semibold cursor-pointer">Reintentar</button>
          <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.assign('/login') }} className="w-full mt-3 text-sm cursor-pointer">Iniciar con otra cuenta</button>
        </div>
      </div>
    )
  }

  const now = new Date()
  const status = storePlan?.subscription_status
  const trialEndsAt = storePlan?.trial_ends_at ? new Date(storePlan.trial_ends_at) : null
  const subEndsAt = storeSubscription?.subscription_ends_at
    ? new Date(storeSubscription.subscription_ends_at)
    : null
  const graceDays = storeSubscription?.grace_period_days ?? 5

  let hasAccess: boolean
  let isPastDueGrace = false
  let remainingGraceDays = 0

  if (status === 'trialing') {
    hasAccess = trialEndsAt !== null && trialEndsAt > now
  } else if (status === 'active' || status === 'past_due') {
    if (!subEndsAt) {
      hasAccess = true
    } else if (now <= subEndsAt) {
      hasAccess = true
    } else {
      const graceDeadline = new Date(subEndsAt.getTime() + graceDays * 86400000)
      if (now <= graceDeadline) {
        hasAccess = true
        isPastDueGrace = true
        remainingGraceDays = Math.max(1, Math.ceil((graceDeadline.getTime() - now.getTime()) / 86400000))
      } else {
        hasAccess = false
      }
    }
  } else {
    hasAccess = false
  }

  const handleSyncOffline = async () => {
    if (!storeId) return
    setIsSyncing(true)
    setSyncFeedback(null)
    try {
      const result = await syncOfflineSales(storeId)
      if (result.syncedCount > 0) {
        setSyncFeedback({
          message: `Sincronización exitosa: ${result.syncedCount} venta(s) guardadas en la nube.`,
        })
      } else if (result.errors.length > 0) {
        setSyncFeedback({
          message: `Error al sincronizar: ${result.errors[0]}`,
          isError: true,
        })
      }
    } catch (err) {
      setSyncFeedback({
        message: err instanceof Error ? err.message : 'Error al conectar con el servidor',
        isError: true,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E8EDDF] text-[#242423] text-center p-6">
        <div className="max-w-md w-full bg-white border border-[#CFDBD5] rounded-xl p-8 shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#FDF0ED] border border-[#F0B2B4] flex items-center justify-center text-[#BC4749]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="font-bold text-lg mb-2 text-[#242423]">Acceso suspendido</p>
          <p className="text-[#5A5D5A] text-xs sm:text-sm leading-relaxed mb-6">
            {status === 'trialing'
              ? 'El período de prueba gratuita de la tienda ha finalizado.'
              : 'La suscripción no se encuentra activa en este momento.'}{' '}
            Comuníquese con su coordinador o soporte técnico para reactivar el servicio.
          </p>

          {offlineSalesCount > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-xs font-semibold text-amber-950">
                  {offlineSalesCount} {offlineSalesCount === 1 ? 'venta offline pendiente' : 'ventas offline pendientes'}
                </p>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed mb-3">
                Existen ventas registradas en esta terminal sin conexión a internet. Sincronízalas para asegurar el dinero e inventario.
              </p>
              {syncFeedback && (
                <div
                  className={`mb-2.5 p-2 rounded text-[11px] font-medium border ${
                    syncFeedback.isError
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {syncFeedback.message}
                </div>
              )}
              <button
                type="button"
                onClick={handleSyncOffline}
                disabled={isSyncing}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSyncing ? 'Sincronizando ventas...' : 'Sincronizar ventas offline ahora'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => window.location.assign('/login')}
            className="w-full px-4 py-2.5 rounded-lg bg-[#242423] hover:bg-[#333533] text-white text-xs font-semibold transition active:scale-95 shadow-xs cursor-pointer"
          >
            Iniciar con otra cuenta
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {isPastDueGrace && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-amber-600 shadow-xs z-50 sticky top-0">
          <div className="flex items-center gap-2 mx-auto">
            <svg className="w-4 h-4 shrink-0 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              Aviso de suscripción: El plan venció el {subEndsAt?.toLocaleDateString('es-BO')}. Cuentas con {remainingGraceDays} {remainingGraceDays === 1 ? 'día' : 'días'} de gracia para registrar el pago antes de la suspensión del servicio.
            </span>
          </div>
        </div>
      )}
      <Outlet />
    </>
  )
}
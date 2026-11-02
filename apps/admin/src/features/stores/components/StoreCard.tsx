import { useNavigate } from 'react-router-dom'
import type { AdminStoreItem } from '@lumen-pos/types'
import { StoreStatusBadge } from './StoreStatusBadge'
import { getStoreExpirationInfo } from './StoresTable'

interface StoreCardProps {
  store: AdminStoreItem
  onOpenDetail?: (store: AdminStoreItem, tab?: 'overview' | 'staff' | 'registers' | 'subscription' | 'payments' | 'overrides') => void
  onOpenOverrides?: (store: AdminStoreItem) => void
  showRegisters?: boolean
}

export function StoreCard({
  store,
  onOpenDetail,
  onOpenOverrides,
  showRegisters = true,
}: StoreCardProps) {
  const navigate = useNavigate()
  const overridesCount = Object.keys(store.feature_overrides || {}).length
  const hasOpenRegisters = (store.open_registers_count ?? 0) > 0
  const exp = getStoreExpirationInfo(store)

  const isSuspended = store.subscription_status === 'suspended' || store.subscription_status === 'canceled'
  const isPastDue = store.subscription_status === 'past_due'

  const handleGoToDetail = (tab: string = 'overview') => {
    if (onOpenDetail) {
      onOpenDetail(store, tab as any)
    } else {
      navigate(tab === 'overview' ? `/stores/${store.id}` : `/stores/${store.id}?tab=${tab}`)
    }
  }

  const handleGoToOverrides = () => {
    if (onOpenOverrides) {
      onOpenOverrides(store)
    } else {
      navigate(`/stores/${store.id}?tab=overrides`)
    }
  }

  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-xl border flex flex-col justify-between transition-all duration-150 shadow-2xs hover:shadow-xs ${
        isSuspended
          ? 'border-rose-300 dark:border-rose-950/70 hover:border-rose-400 dark:hover:border-rose-900/80 bg-rose-50/20 dark:bg-zinc-900'
          : isPastDue
          ? 'border-amber-300 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-800/80'
          : exp.isExpiring
          ? 'border-amber-300 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-800/60'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => handleGoToDetail('overview')}
              className="text-left group cursor-pointer block max-w-full"
            >
              <h3 className="font-bold text-zinc-950 dark:text-white text-base group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors truncate">
                {store.name}
              </h3>
            </button>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{store.industry_sub_type || 'Comercio retail'}</span>
              <span className="text-zinc-400 dark:text-zinc-500" aria-hidden="true">·</span>
              <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">ID: {store.id.slice(0, 8)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StoreStatusBadge status={store.subscription_status} />
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
              {store.plan_name || 'Sin plan'}
            </span>
          </div>
        </div>

        {isSuspended && (
          <div className="mt-3.5 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Acceso bloqueado: suscripción suspendida por falta de pago</span>
          </div>
        )}

        {isPastDue && (
          <div className="mt-3.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium truncate">En período de gracia comercial</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/90 dark:text-amber-300 text-[11px] font-bold shrink-0 border border-amber-200 dark:border-amber-700/60">
              {exp.graceRemaining} {exp.graceRemaining === 1 ? 'día restante' : 'días restantes'}
            </span>
          </div>
        )}

        {!isSuspended && !isPastDue && exp.isExpiring && (
          <div
            className={`mt-3.5 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 border ${
              exp.daysRemaining !== null && exp.daysRemaining <= 3
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium truncate">{exp.label}</span>
            </div>
            {exp.targetDate && (
              <span className="text-[11px] opacity-90 shrink-0 font-mono text-zinc-600 dark:text-zinc-300">
                {new Date(exp.targetDate).toLocaleDateString('es-BO', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            )}
          </div>
        )}

        {showRegisters && (
          <div className="mt-3.5">
            {hasOpenRegisters ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>
                  {store.open_registers_count} {store.open_registers_count === 1 ? 'caja operando en vivo' : 'cajas operando en vivo'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-400 text-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                <span>Cajas cerradas actualmente</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block">
              Propietario
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-200 block truncate mt-0.5">
              {store.owner_name || 'Sin asignar'}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
              {store.owner_email || '—'}
            </span>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block">
              Catálogo
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-200 block mt-0.5">
              {store.products_count ?? 0} {store.products_count === 1 ? 'artículo' : 'artículos'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
              {store.active_users_count ?? 0} {store.active_users_count === 1 ? 'usuario activo' : 'usuarios activos'}
            </span>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block">
              Última venta
            </span>
            <span className="text-zinc-700 dark:text-zinc-300 block mt-0.5">
              {store.last_sale_at
                ? new Date(store.last_sale_at).toLocaleDateString('es-BO', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Sin ventas registradas'}
            </span>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block">
              Facturación
            </span>
            <span className="text-zinc-700 dark:text-zinc-300 block mt-0.5">
              {store.billing_cycle === 'annual'
                ? 'Ciclo Anual'
                : store.billing_cycle === 'semiannual'
                ? 'Ciclo Semestral'
                : 'Ciclo Mensual'}
            </span>
            {exp.targetDate && !exp.isExpiring && !isSuspended && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-mono">
                Renueva: {new Date(exp.targetDate).toLocaleDateString('es-BO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {overridesCount > 0 && (
          <div className="mt-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
              {overridesCount} {overridesCount === 1 ? 'función personalizada activa' : 'funciones personalizadas activas'}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:px-5 sm:py-3.5 bg-zinc-50/80 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleGoToOverrides}
          className="px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 rounded-lg transition border border-zinc-200 dark:border-zinc-700/80 cursor-pointer flex items-center gap-1.5 shadow-2xs"
          title="Configurar excepciones y permisos especiales de módulos"
        >
          <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span>Funciones</span>
        </button>

        <div className="flex items-center gap-2">
          {isSuspended || isPastDue || exp.isExpiring ? (
            <button
              type="button"
              onClick={() => handleGoToDetail('subscription')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                isSuspended
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>{isSuspended ? 'Reactivar con pago' : 'Registrar pago'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleGoToDetail('overview')}
              className="px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver control</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

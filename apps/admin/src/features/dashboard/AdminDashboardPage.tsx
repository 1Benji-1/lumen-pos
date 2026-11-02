import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStores } from '../stores/hooks/useAdminStores'
import { getStoreExpirationInfo } from '../stores/components/StoresTable'
import { StoreCard } from '../stores/components/StoreCard'
import { CreateStoreModal } from '../stores/components/CreateStoreModal'

export function AdminDashboardPage() {
  const { data: stores = [], isLoading, error } = useStores()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const totalStores = stores.length
  const activeStores = stores.filter((s) => s.subscription_status === 'active').length
  const trialingStores = stores.filter((s) => s.subscription_status === 'trialing').length
  const suspendedStores = stores.filter(
    (s) => s.subscription_status === 'suspended' || s.subscription_status === 'canceled'
  ).length
  const expiringStores = stores.filter((s) => getStoreExpirationInfo(s).isExpiring).length

  const standardCount = stores.filter((s) => s.plan_code === 'standard').length
  const proCount = stores.filter((s) => s.plan_code === 'pro').length
  const businessCount = stores.filter((s) => s.plan_code === 'enterprise').length

  const monthlyCount = stores.filter((s) => s.billing_cycle === 'monthly' || !s.billing_cycle).length
  const annualCount = stores.filter((s) => s.billing_cycle === 'annual' || s.billing_cycle === 'semiannual').length

  const totalProducts = stores.reduce((acc, s) => acc + (s.products_count || 0), 0)
  const totalUsers = stores.reduce((acc, s) => acc + (s.active_users_count || 0), 0)

  const priorityStores = stores
    .filter((s) => {
      const exp = getStoreExpirationInfo(s)
      return exp.isExpiring || s.subscription_status === 'suspended' || s.subscription_status === 'canceled'
    })
    .sort((a, b) => {
      const remA = getStoreExpirationInfo(a).daysRemaining ?? 9999
      const remB = getStoreExpirationInfo(b).daysRemaining ?? 9999
      return remA - remB
    })

  const getPercentage = (count: number) => {
    if (totalStores === 0) return 0
    return Math.round((count / totalStores) * 100)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">Panel de Control</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Supervisión de salud de la plataforma, planes y alertas de suscripción comercial.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/stores"
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white text-xs font-semibold transition border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 shadow-2xs"
            >
              <span>Ver directorio de tiendas</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear tienda</span>
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center text-xs text-zinc-500 dark:text-zinc-400 shadow-2xs">
            Cargando métricas de la plataforma...
          </div>
        )}

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-300">
            Error al consultar datos de la plataforma: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Total comercios</div>
                <div className="text-2xl font-bold text-zinc-950 dark:text-white mt-1.5">{totalStores}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Registrados en la plataforma</div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Suscripción activa</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{activeStores}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Al día con sus pagos</div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Período de prueba</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1.5">{trialingStores}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">En evaluación de servicio</div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Por vencer o en gracia</div>
                  {expiringStores > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">{expiringStores}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {suspendedStores > 0 ? `${suspendedStores} suspendidas` : 'Sin suspensiones'}
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                    Atención Prioritaria y Cobranzas
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Comercios en período de gracia, con vencimiento en menos de 7 días o suspendidos.
                  </p>
                </div>

                {priorityStores.length > 0 && (
                  <Link
                    to="/stores?tab=expiring"
                    className="text-xs text-zinc-900 dark:text-zinc-100 hover:underline font-semibold transition flex items-center gap-1"
                  >
                    <span>Ver todas ({priorityStores.length})</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>

              {priorityStores.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-6 text-center shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-semibold text-zinc-950 dark:text-white">Todo al día</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    No hay comercios en período de gracia ni suscripciones próximas a vencer en este momento.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {priorityStores.slice(0, 3).map((store) => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      showRegisters={false}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                    Distribución por Planes
                  </h2>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{totalStores} total</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">Standard</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                        {standardCount} ({getPercentage(standardCount)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 dark:bg-zinc-300 rounded-full transition-all duration-300"
                        style={{ width: `${getPercentage(standardCount)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">Pro</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                        {proCount} ({getPercentage(proCount)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${getPercentage(proCount)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">Business</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                        {businessCount} ({getPercentage(businessCount)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${getPercentage(businessCount)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                    Facturación y Volumen de Red
                  </h2>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Plataforma</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs uppercase font-semibold text-zinc-600 dark:text-zinc-400 block">
                      Ciclo Anual
                    </span>
                    <span className="text-lg font-bold text-zinc-950 dark:text-white block mt-1">
                      {annualCount}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      {getPercentage(annualCount)}% del total
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs uppercase font-semibold text-zinc-600 dark:text-zinc-400 block">
                      Ciclo Mensual
                    </span>
                    <span className="text-lg font-bold text-zinc-950 dark:text-white block mt-1">
                      {monthlyCount}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      {getPercentage(monthlyCount)}% del total
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs uppercase font-semibold text-zinc-600 dark:text-zinc-400 block">
                      Artículos en catálogo
                    </span>
                    <span className="text-lg font-bold text-zinc-950 dark:text-white block mt-1">
                      {totalProducts.toLocaleString('es-BO')}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Total en red
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs uppercase font-semibold text-zinc-600 dark:text-zinc-400 block">
                      Usuarios de personal
                    </span>
                    <span className="text-lg font-bold text-zinc-950 dark:text-white block mt-1">
                      {totalUsers.toLocaleString('es-BO')}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Cuentas activas
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Link
                to="/stores"
                className="group p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-2xs hover:shadow-xs flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                    Directorio Completo de Tiendas
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Explora comercios con vista de tarjetas o tabla, exporta reportes en CSV y gestiona suscripciones.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 flex items-center justify-center transition-colors shrink-0 ml-4">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link
                to="/feedback"
                className="group p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-2xs hover:shadow-xs flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                    Bandeja de Feedback de Comercios
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Revisa sugerencias, reportes técnicos y valoraciones enviadas directamente desde las terminales de venta.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 flex items-center justify-center transition-colors shrink-0 ml-4">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </section>
          </>
        )}

        <CreateStoreModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  )
}

export default AdminDashboardPage

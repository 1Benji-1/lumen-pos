import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { type TopProductsPeriod } from '@lumen-pos/types'
import { useStoreModules } from '../../shared/hooks/useStoreModules'
import { useDashboardData } from './hooks/useDashboardData'
import { QuickAdjustmentModal } from '../inventory/components/QuickAdjustmentModal'
import { CorteXModal } from '../pos/components/CorteXModal'
import { useCurrentUserRole } from '../../shared/hooks/useCurrentUserRole'

function formatElapsedTime(isoString?: string): { text: string; isLongShift: boolean } {
  if (!isoString) return { text: '—', isLongShift: false }
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60000))
  const hours = Math.floor(elapsedMinutes / 60)
  const minutes = elapsedMinutes % 60
  const isLongShift = hours >= 8
  if (hours === 0) {
    return { text: `${minutes}m`, isLongShift }
  }
  return { text: `${hours}h ${minutes}m`, isLongShift }
}

export function DashboardPage() {
  const { hasPermission, loading: roleLoading } = useCurrentUserRole()
  const { storeId, storeName, canAccessModule, isLoading: modulesLoading } =
    useStoreModules()
  const showInventory = canAccessModule('inventory')
  const showAnalytics = canAccessModule('analytics')

  const [topProductsPeriod, setTopProductsPeriod] = useState<TopProductsPeriod>('today')
  const [adjustModalVariantId, setAdjustModalVariantId] = useState<string | null>(null)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [selectedRegisterIdForCorteX, setSelectedRegisterIdForCorteX] = useState<string | null>(null)

  const {
    data: dashData,
    isLoading: dataLoading,
    isError,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
  } = useDashboardData(storeId, topProductsPeriod)

  const isLoading = (modulesLoading || dataLoading) && !dashData && !isError

  // Formato de fecha para hoy
  const todayFormatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)

  // Cálculo reactivo del tiempo transcurrido desde la última sincronización exitosa
  const [timeAgo, setTimeAgo] = useState<string>('')

  useEffect(() => {
    if (!dataUpdatedAt) {
      setTimeAgo('')
      return
    }

    const updateAgo = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000))
      if (elapsedSeconds < 15) {
        setTimeAgo('hace un instante')
      } else if (elapsedSeconds < 60) {
        setTimeAgo(`hace ${elapsedSeconds}s`)
      } else {
        const minutes = Math.floor(elapsedSeconds / 60)
        if (minutes < 60) {
          setTimeAgo(minutes === 1 ? 'hace 1 min' : `hace ${minutes} min`)
        } else {
          const hours = Math.floor(minutes / 60)
          setTimeAgo(hours === 1 ? 'hace 1h' : `hace ${hours}h`)
        }
      }
    }

    updateAgo()
    const timer = setInterval(updateAgo, 15000)
    return () => clearInterval(timer)
  }, [dataUpdatedAt])

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-inventory-view">
      {/* 1. Cabecera principal */}
      <div className="border-b border-[#CFDBD5] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#242423] tracking-tight">
              {storeName || 'Panel de control'}
            </h1>
          </div>
          <p className="text-[#5A5D5A] text-sm mt-1">
            {capitalizedDate}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {timeAgo && !isError && (
            <span
              className="text-xs text-[#5A5D5A] hidden sm:inline-flex items-center gap-1.5"
              title={dataUpdatedAt ? `Última sincronización: ${new Date(dataUpdatedAt).toLocaleTimeString()}` : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#588157]" />
              <span>Sincronizado {timeAgo}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#CFDBD5] hover:bg-[#E5E5E5] text-xs font-semibold text-[#242423] transition disabled:opacity-50 shadow-2xs active:scale-[0.98]"
            title="Actualizar datos operativos de hoy"
          >
            <svg
              aria-hidden="true"
              className={`w-4 h-4 ${isRefetching ? 'animate-spin text-[#8A6D14]' : 'text-[#5A5D5A]'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefetching ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <div className="h-36 bg-white border border-[#CFDBD5] rounded-xl shadow-xs" />
          <div className="h-36 bg-white border border-[#CFDBD5] rounded-xl shadow-xs" />
          <div className="h-36 bg-white border border-[#CFDBD5] rounded-xl shadow-xs" />
        </div>
      ) : isError && !dashData ? (
        /* Fallo total de conexión: NUNCA mostrar ceros falsos ni fingir normalidad */
        <div className="bg-white border border-[#F0B2B4] rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm my-6">
          <div className="w-14 h-14 rounded-full bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] flex items-center justify-center mx-auto shadow-2xs">
            <svg aria-hidden="true" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#242423]">
              No se pudieron cargar los datos operativos
            </h2>
            <p className="text-xs text-[#5A5D5A] mt-1.5 max-w-md mx-auto">
              Ocurrió un error al comunicarse con el servidor. Para proteger la veracidad de tu comercio, no mostramos valores en cero que puedan resultar engañosos.
            </p>
            {error && (
              <p className="text-xs font-mono text-[#BC4749] bg-[#FDF0ED] py-1.5 px-3 rounded-md mt-3 inline-block border border-[#F0B2B4]">
                {error instanceof Error ? error.message : 'Error de conexión con el servicio'}
              </p>
            )}
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold rounded-lg transition shadow-xs active:scale-[0.98] disabled:opacity-50"
            >
              <svg
                aria-hidden="true"
                className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{isRefetching ? 'Reintentando conexión...' : 'Reintentar conexión'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Banner de advertencia si falló la recarga en segundo plano pero hay datos previos en caché */}
          {isError && dashData && (
            <div className="bg-[#FEF9E7] border border-[#F5CB5C]/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <svg aria-hidden="true" className="w-5 h-5 text-[#8A6D14] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <strong className="text-[#242423]">Fallo en la última actualización:</strong>{' '}
                  <span className="text-[#8A6D14]">
                    No se pudo contactar al servidor. Mostrando los últimos datos registrados ({timeAgo || 'en caché'}).
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="min-h-[44px] self-end sm:self-center px-4 py-2 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-bold rounded-lg text-xs transition shadow-2xs shrink-0 disabled:opacity-50 inline-flex items-center justify-center"
              >
                {isRefetching ? 'Reintentando...' : 'Reintentar ahora'}
              </button>
            </div>
          )}

          {/* 2. Resumen Operativo Clave: 3 Tarjetas Superiores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Resumen de ventas de hoy */}
            <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 flex flex-col justify-between hover:border-[#242423]/40 transition relative overflow-hidden group shadow-xs">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#EFF5EE] rounded-bl-full pointer-events-none group-hover:bg-[#E2EDE1] transition" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                    Ventas de hoy
                  </span>
                  <div className="p-2 rounded-lg bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-[#242423] tracking-tight font-mono tabular-nums">
                  Bs {(dashData?.todaySales.totalAmount ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-[#5A5D5A] mt-2 flex items-center gap-2">
                  <span className="font-semibold text-[#242423] font-mono tabular-nums">
                    {dashData?.todaySales.transactionCount ?? 0}
                  </span>
                  <span>transacciones registradas hoy</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between text-xs text-[#5A5D5A] min-h-[44px]">
                <span>
                  Ticket promedio:{' '}
                  <strong className="font-semibold text-[#242423] font-mono tabular-nums">
                    Bs {(dashData?.todaySales.averageTicket ?? 0).toFixed(2)}
                  </strong>
                </span>
                <Link
                  to="/pos/ventas"
                  className="min-h-[44px] text-xs font-semibold text-[#242423] hover:text-black hover:underline transition inline-flex items-center gap-1"
                >
                  <span>Ver ventas</span>
                  <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#588157]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Card 2: Efectivo en Gavetas Físicas vs Bancos */}
            <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 flex flex-col justify-between hover:border-[#242423]/40 transition relative overflow-hidden group shadow-xs">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#EFF5EE] rounded-bl-full pointer-events-none group-hover:bg-[#E2EDE1] transition" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                    Dinero en Gavetas Físicas
                  </span>
                  <div className="p-2 rounded-lg bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>

                {(() => {
                  const totalExpectedCash = (dashData?.activeRegisters ?? []).reduce(
                    (acc, r) => acc + (r.expectedCashInDrawer || 0),
                    0
                  ) || (dashData?.liveShift?.expectedCashInDrawer ?? 0)

                  const totalDigital =
                    (dashData?.todaySales?.byPaymentMethod?.qr ?? 0) +
                    (dashData?.todaySales?.byPaymentMethod?.card ?? 0) +
                    (dashData?.todaySales?.byPaymentMethod?.transfer ?? 0)

                  const totalGlobal = totalExpectedCash + totalDigital
                  const cashPct = totalGlobal > 0 ? Math.round((totalExpectedCash / totalGlobal) * 100) : 0
                  const digitalPct = totalGlobal > 0 ? 100 - cashPct : 0

                  return (
                    <>
                      <div className="text-3xl font-extrabold text-[#242423] tracking-tight font-mono tabular-nums">
                        Bs {totalExpectedCash.toFixed(2)}
                      </div>
                      <div className="text-xs text-[#5A5D5A] mt-2">
                        {dashData?.activeRegisters && dashData.activeRegisters.length > 0 ? (
                          <span className="text-[#588157] font-semibold">
                            En {dashData.activeRegisters.length} {dashData.activeRegisters.length === 1 ? 'caja activa' : 'cajas activas'} en mostrador
                          </span>
                        ) : (
                          <span>Sin cajas abiertas en este momento</span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1">
                        <div className="h-1.5 w-full bg-[#CFDBD5]/60 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${cashPct}%` }}
                            className="bg-[#588157] h-full transition-all"
                            title={`Efectivo en mostrador: ${cashPct}%`}
                          />
                          <div
                            style={{ width: `${digitalPct}%` }}
                            className="bg-[#F5CB5C] h-full transition-all"
                            title={`Digital / Banco: ${digitalPct}%`}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-[#5A5D5A]">
                          <span>Bancos/QR: Bs {totalDigital.toFixed(2)}</span>
                          <span>{cashPct}% físico</span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between text-xs min-h-[44px]">
                <span className="text-[#5A5D5A]">Flujo físico supervisado</span>
                {showAnalytics && !roleLoading && (hasPermission('pos:audit_cash') || hasPermission('analytics:view')) && (
                  <Link
                    to="/analytics?tab=cash_audit"
                    className="min-h-[44px] font-semibold text-[#242423] hover:underline transition inline-flex items-center gap-1"
                  >
                    <span>Auditar arqueos</span>
                    <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#588157]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>

            {/* Card 3: Alertas de stock bajo */}
            {showInventory && <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 flex flex-col justify-between hover:border-[#242423]/40 transition relative overflow-hidden group shadow-xs">
              <div
                className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none transition ${
                  (dashData?.lowStock.lowStockCount ?? 0) > 0
                    ? 'bg-[#FDF0ED] group-hover:bg-[#F9E2DD]'
                    : 'bg-[#EFF5EE] group-hover:bg-[#E2EDE1]'
                }`}
              />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                    Alertas de stock
                  </span>
                  <div
                    className={`p-2 rounded-lg border ${
                      (dashData?.lowStock.lowStockCount ?? 0) > 0
                        ? 'bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4]'
                        : 'bg-[#EFF5EE] text-[#588157] border-[#BBD2B8]'
                    }`}
                  >
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                </div>

                <div className="text-3xl font-extrabold text-[#242423] tracking-tight font-mono tabular-nums">
                  {dashData?.lowStock.lowStockCount ?? 0}
                </div>

                <div className="text-xs text-[#5A5D5A] mt-2">
                  {(dashData?.lowStock.lowStockCount ?? 0) > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#BC4749] font-semibold tabular-nums">
                        {(dashData?.lowStock.outOfStockCount ?? 0) > 0
                          ? `${dashData?.lowStock.outOfStockCount} agotado(s)`
                          : 'Bajo el umbral mínimo'}
                      </span>
                      <span>requieren reposición inmediata</span>
                    </div>
                  ) : (
                    <span className="text-[#588157] font-semibold">
                      Todos los productos tienen existencias óptimas
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between">
                <Link
                  to="/inventario?filter=low_stock"
                  className="min-h-[44px] text-xs font-semibold text-[#BC4749] hover:text-[#9E3B3D] hover:underline transition inline-flex items-center gap-1"
                >
                  <span>Ver listado en Inventario</span>
                  <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>}
          </div>

          {/* 3. Sección Central: Productos más vendidos y Artículos críticos (Grid equilibrado 50/50) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Productos Más Vendidos */}
            <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#CFDBD5]">
                  <div>
                    <h2 className="text-base font-bold text-[#242423] tracking-tight flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4 text-[#8A6D14]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      <span>Productos más vendidos</span>
                    </h2>
                    <p className="text-xs text-[#5A5D5A] mt-0.5">
                      {topProductsPeriod === 'today'
                        ? 'Mayor rotación en ventas de hoy.'
                        : topProductsPeriod === 'week'
                        ? 'Mayor rotación en los últimos 7 días.'
                        : 'Mayor rotación en los últimos 30 días.'}
                    </p>
                  </div>

                  {/* Selector de período: Hoy | Semana | Mes */}
                  <div className="inline-flex p-1 bg-[#E8EDDF]/80 rounded-lg border border-[#CFDBD5] self-start sm:self-center shrink-0">
                    {(
                      [
                        { id: 'today', label: 'Hoy' },
                        { id: 'week', label: 'Semana' },
                        { id: 'month', label: 'Mes' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTopProductsPeriod(p.id)}
                        className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          topProductsPeriod === p.id
                            ? 'bg-white text-[#242423] shadow-2xs font-bold'
                            : 'text-[#5A5D5A] hover:text-[#242423]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {!dashData?.topProducts || dashData.topProducts.length === 0 ? (
                  <div className="py-12 text-center text-[#5A5D5A]">
                    <svg
                      aria-hidden="true"
                      className="w-10 h-10 mx-auto mb-3 text-[#CFDBD5]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="text-sm font-semibold text-[#242423]">
                      {topProductsPeriod === 'today'
                        ? 'Sin ventas registradas hoy'
                        : 'Sin ventas registradas en este período'}
                    </p>
                    <p className="text-xs text-[#5A5D5A] mt-1 max-w-sm mx-auto">
                      A medida que se completen ventas en el período seleccionado, verás aquí el ranking de los artículos más pedidos.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#CFDBD5] text-[#5A5D5A] text-xs uppercase tracking-wider font-semibold">
                          <th scope="col" className="pb-3 font-semibold">#</th>
                          <th scope="col" className="pb-3 font-semibold">Producto / Variante</th>
                          <th scope="col" className="pb-3 font-semibold text-right">Cant. Vendida</th>
                          <th scope="col" className="pb-3 font-semibold text-right">Total Generado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CFDBD5]/40 text-xs">
                        {dashData.topProducts.map((p, index) => (
                          <tr key={p.variantId} className="hover:bg-[#E5E5E5]/40 transition">
                            <td className="py-3 pr-2 text-xs font-bold text-[#5A5D5A] tabular-nums">
                              <span className="w-6 h-6 rounded-full bg-[#E5E5E5] border border-[#CFDBD5] flex items-center justify-center text-xs text-[#242423] font-mono tabular-nums">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="font-semibold text-[#242423] text-sm">{p.productName}</div>
                              {p.variantName && (
                                <div className="text-xs text-[#5A5D5A]">{p.variantName}</div>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <span className="inline-block px-2.5 py-1 rounded bg-[#E5E5E5] text-xs font-mono font-bold text-[#242423] border border-[#CFDBD5] tabular-nums">
                                {p.totalQuantity} u.
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-[#242423] text-sm tabular-nums">
                              Bs {p.totalRevenue.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between text-xs min-h-[44px]">
                <span className="text-[#5A5D5A] tabular-nums">
                  {dashData?.topProducts?.length ?? 0} artículos con mayor rotación
                </span>
                {showAnalytics && <Link
                  to="/analytics"
                  className="min-h-[44px] font-semibold text-[#5A5D5A] hover:text-[#242423] hover:underline transition inline-flex items-center gap-1"
                >
                  <span>Ver analíticas completas</span>
                  <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>}
              </div>
            </div>

            {/* Resumen de Artículos Críticos */}
            {showInventory && <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#CFDBD5]">
                  <div>
                    <h2 className="text-base font-bold text-[#242423] tracking-tight flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4 text-[#BC4749]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <span>Artículos críticos</span>
                    </h2>
                    <p className="text-xs text-[#5A5D5A] mt-0.5">
                      Existencias en o por debajo del umbral mínimo de seguridad.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4] tabular-nums">
                    {dashData?.lowStock.lowStockCount ?? 0} alertas
                  </span>
                </div>

                {!dashData?.lowStock.items || dashData.lowStock.items.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#EFF5EE] text-[#588157] flex items-center justify-center mx-auto mb-2 border border-[#BBD2B8]">
                      <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#242423]">Inventario al día</p>
                    <p className="text-xs text-[#5A5D5A] mt-1">
                      Ningún producto se encuentra por debajo de su umbral de stock mínimo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dashData.lowStock.items.map((item) => (
                      <div
                        key={item.variantId}
                        className="p-3 rounded-lg bg-[#E8EDDF]/40 border border-[#CFDBD5] flex items-center justify-between gap-3 text-xs hover:bg-[#E8EDDF]/70 transition group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#242423] truncate">{item.productName}</p>
                          <p className="text-[#5A5D5A] text-xs truncate">
                            {item.variantName} • Mínimo sugerido:{' '}
                            <span className="font-mono tabular-nums">{item.lowStockThreshold}</span> {item.unit || 'u'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-bold font-mono tabular-nums ${
                              item.stockQuantity <= 0
                                ? 'bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]'
                                : 'bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/50'
                            }`}
                          >
                            {item.stockQuantity <= 0
                              ? 'Agotado'
                              : `${item.stockQuantity} ${item.unit || 'u'}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustModalVariantId(item.variantId)
                              setIsAdjustModalOpen(true)
                            }}
                            className="min-h-[44px] px-3.5 py-2 rounded-md bg-white border border-[#CFDBD5] hover:bg-[#242423] hover:text-white hover:border-[#242423] text-[#242423] text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 active:scale-[0.98]"
                            title={`Reabastecer o ajustar stock de ${item.productName}`}
                          >
                            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Ajustar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between gap-2 text-xs min-h-[44px]">
                <span className="text-[#5A5D5A]">
                  {dashData?.lowStock.outOfStockCount && dashData.lowStock.outOfStockCount > 0 ? (
                    <span className="tabular-nums">
                      {dashData.lowStock.outOfStockCount} artículo(s) totalmente agotado(s)
                    </span>
                  ) : (
                    'Existencias vigiladas'
                  )}
                </span>
                <Link
                  to="/inventario?filter=low_stock"
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#E5E5E5] hover:bg-[#CFDBD5] text-[#242423] font-semibold transition shadow-2xs active:scale-[0.98]"
                >
                  <span>Revisar inventario filtrado</span>
                  <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>}
          </div>

          {/* 4. Monitor de Cajas en Vivo (Centro de Control Operativo) */}
          <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CFDBD5]">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-[#242423] tracking-tight flex items-center gap-2">
                    <svg aria-hidden="true" className="w-5 h-5 text-[#8A6D14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Monitor de Cajas en Vivo</span>
                  </h2>
                  {dashData?.activeRegisters && dashData.activeRegisters.length > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#588157] animate-pulse" />
                      <span>{dashData.activeRegisters.length} {dashData.activeRegisters.length === 1 ? 'Caja activa' : 'Cajas activas'}</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8EDDF] text-[#5A5D5A] border border-[#CFDBD5]">
                      Sin cajas abiertas
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5A5D5A] mt-1">
                  Supervisión de terminales en tiempo real, cajeros en turno y saldos proyectados en gaveta.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  to="/pos"
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold rounded-lg transition shadow-2xs active:scale-[0.98]"
                >
                  <span>Ir a Terminal POS</span>
                  <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                {showAnalytics && !roleLoading && (hasPermission('pos:audit_cash') || hasPermission('analytics:view')) && (
                  <Link
                    to="/analytics?tab=cash_audit"
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-[#CFDBD5] hover:bg-[#E5E5E5] text-[#242423] text-xs font-semibold rounded-lg transition shadow-2xs active:scale-[0.98]"
                  >
                    <span>Auditar arqueos cerrados</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Listado de cajas activas */}
            {dashData?.activeRegisters && dashData.activeRegisters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {dashData.activeRegisters.map((reg, idx) => {
                  const shiftInfo = formatElapsedTime(reg.openedAt)
                  const openedTime = reg.openedAt
                    ? new Date(reg.openedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    : '—'

                  return (
                    <div
                      key={reg.id}
                      className="rounded-xl border border-[#CFDBD5] bg-[#E8EDDF]/30 p-5 flex flex-col justify-between space-y-4 hover:border-[#242423]/40 transition shadow-2xs group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#588157] animate-pulse" />
                              <h3 className="font-bold text-[#242423] text-sm">
                                Caja #{idx + 1} • {reg.cashierName}
                              </h3>
                            </div>
                            <div className="text-xs text-[#5A5D5A] mt-0.5 flex items-center gap-1.5">
                              <span>Apertura: {openedTime}</span>
                              <span>•</span>
                              <span>Turno: {shiftInfo.text}</span>
                            </div>
                          </div>

                          {shiftInfo.isLongShift ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/60" title="Turno con más de 8 horas consecutivas">
                              &gt; 8h
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                              Activa
                            </span>
                          )}
                        </div>

                        {/* Cuadro destacado de Efectivo Esperado en Gaveta */}
                        <div className="p-3.5 bg-white rounded-lg border border-[#CFDBD5]/80 space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A5D5A] block">
                            Efectivo Esperado en Gaveta
                          </span>
                          <div className="text-2xl font-extrabold text-[#588157] font-mono tabular-nums tracking-tight">
                            Bs {reg.expectedCashInDrawer.toFixed(2)}
                          </div>
                          <span className="text-[11px] text-[#5A5D5A] block">
                            Apertura: Bs {reg.openingAmount.toFixed(2)} + Ventas efect.: Bs {reg.cashSales.toFixed(2)}
                          </span>
                        </div>

                        {/* Desglose complementario de ventas y cobros digitales */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-white border border-[#CFDBD5]/60">
                            <span className="text-[#5A5D5A] block text-[11px]">Ventas Totales</span>
                            <span className="font-bold text-[#242423] font-mono tabular-nums">
                              Bs {reg.totalSales.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-[#5A5D5A] block mt-0.5">
                              {reg.transactionCount} tickets
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white border border-[#CFDBD5]/60">
                            <span className="text-[#5A5D5A] block text-[11px]">Cobro Digital / QR</span>
                            <span className="font-bold text-[#242423] font-mono tabular-nums">
                              Bs {reg.digitalSales.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-[#5A5D5A] block mt-0.5">
                              {reg.cashIn - reg.cashOut !== 0 ? `Movs: ${reg.cashIn - reg.cashOut > 0 ? '+' : ''}${(reg.cashIn - reg.cashOut).toFixed(0)}` : 'Sin retiros'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botón directo de auditoría Corte X */}
                      <div className="pt-2 border-t border-[#CFDBD5]/60">
                        <button
                          type="button"
                          onClick={() => setSelectedRegisterIdForCorteX(reg.id)}
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-bold text-xs rounded-lg transition shadow-2xs active:scale-[0.98]"
                          title={`Auditar y generar Corte X en vivo para ${reg.cashierName}`}
                        >
                          <svg aria-hidden="true" className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Ver Corte X en Vivo</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-10 text-center bg-[#E8EDDF]/30 rounded-xl border border-dashed border-[#CFDBD5] p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-white border border-[#CFDBD5] flex items-center justify-center mx-auto text-[#5A5D5A] shadow-2xs">
                  <svg aria-hidden="true" className="w-6 h-6 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#242423]">No hay cajas registradoras abiertas</h3>
                  <p className="text-xs text-[#5A5D5A] mt-1 max-w-md mx-auto leading-relaxed">
                    Todas las terminales se encuentran cerradas. Cuando un cajero inicie turno en el Punto de Venta, podrás supervisar su dinero y ventas aquí en vivo.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Link
                    to="/pos"
                    className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold rounded-lg transition shadow-2xs"
                  >
                    <span>Abrir caja en POS</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 5. Dos Columnas: Feed de Movimientos de Caja e Ingresos por Método de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Feed en Vivo de Movimientos de Caja */}
            <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#CFDBD5]">
                  <div>
                    <h2 className="text-base font-bold text-[#242423] tracking-tight flex items-center gap-2">
                      <svg aria-hidden="true" className="w-4 h-4 text-[#588157]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      <span>Movimientos de Efectivo (Hoy)</span>
                    </h2>
                    <p className="text-xs text-[#5A5D5A] mt-0.5">
                      Ingresos de sencillo y retiros manuales en tiempo real.
                    </p>
                  </div>

                  {showAnalytics && !roleLoading && (hasPermission('pos:audit_cash') || hasPermission('analytics:view')) && (
                    <Link
                      to="/analytics?tab=cash_audit"
                      className="min-h-[44px] text-xs font-semibold text-[#5A5D5A] hover:text-[#242423] hover:underline transition inline-flex items-center gap-1 self-start sm:self-center"
                    >
                      <span>Auditoría de arqueos</span>
                      <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>

                {!dashData?.recentMovements || dashData.recentMovements.length === 0 ? (
                  <div className="py-8 text-center text-[#5A5D5A]">
                    <p className="text-xs font-medium">No se han registrado retiros ni ingresos manuales de efectivo hoy.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#CFDBD5]/50">
                    {dashData.recentMovements.slice(0, 6).map((mov) => {
                      const movTime = mov.createdAt
                        ? new Date(mov.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                        : '—'

                      return (
                        <div key={mov.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center font-bold text-xs border ${
                                mov.type === 'in'
                                  ? 'bg-[#EFF5EE] text-[#588157] border-[#BBD2B8]'
                                  : 'bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4]'
                              }`}
                            >
                              {mov.type === 'in' ? '+' : '−'}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#242423] truncate">
                                {mov.reason}
                              </p>
                              <p className="text-[11px] text-[#5A5D5A]">
                                {mov.performedByName} • {movTime}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono font-bold tabular-nums text-xs ${
                                mov.type === 'in' ? 'text-[#588157]' : 'text-[#BC4749]'
                              }`}
                            >
                              {mov.type === 'in' ? '+' : '−'}Bs {mov.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between text-xs min-h-[44px]">
                <span className="text-[#5A5D5A] tabular-nums">
                  {dashData?.recentMovements?.length ?? 0} movimiento(s) registrado(s) hoy
                </span>
                <span className="text-[11px] text-[#5A5D5A]">Auditoría continua</span>
              </div>
            </div>

            {/* Columna Derecha: Desglose de ingresos de hoy por método de pago */}
            <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#CFDBD5]">
                  <div>
                    <h2 className="text-base font-bold text-[#242423] tracking-tight">
                      Ventas de Hoy por Medio de Pago
                    </h2>
                    <p className="text-xs text-[#5A5D5A] mt-0.5">
                      Canales de recaudo físicos y digitales asegurados hoy.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#242423] bg-[#E8EDDF] px-2.5 py-1 rounded border border-[#CFDBD5] tabular-nums">
                    Bs {(dashData?.todaySales.totalAmount ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* Barra de distribución porcentual Efectivo vs Digital */}
                {(() => {
                  const total = dashData?.todaySales.totalAmount ?? 0
                  const cash = dashData?.todaySales.byPaymentMethod?.cash ?? 0
                  const digital =
                    (dashData?.todaySales.byPaymentMethod?.qr ?? 0) +
                    (dashData?.todaySales.byPaymentMethod?.transfer ?? 0) +
                    (dashData?.todaySales.byPaymentMethod?.card ?? 0)
                  const cashPct = total > 0 ? Math.round((cash / total) * 100) : 0
                  const digitalPct = total > 0 ? 100 - cashPct : 0

                  return (
                    <div className="space-y-2">
                      <div className="h-2.5 w-full bg-[#CFDBD5]/60 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${cashPct}%` }}
                          className="bg-[#588157] h-full transition-all"
                          title={`Efectivo: Bs ${cash.toFixed(2)} (${cashPct}%)`}
                        />
                        <div
                          style={{ width: `${digitalPct}%` }}
                          className="bg-[#F5CB5C] h-full transition-all"
                          title={`Digital / QR / Tarjeta: Bs ${digital.toFixed(2)} (${digitalPct}%)`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[#5A5D5A]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#588157]" />
                          <span>Efectivo: {cashPct}%</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#F5CB5C]" />
                          <span>Bancos / QR / Tarjeta: {digitalPct}%</span>
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {/* Grid de métodos individuales */}
                <div className="grid grid-cols-3 gap-2.5 pt-2">
                  <div className="p-3 rounded-lg bg-[#E8EDDF]/40 border border-[#CFDBD5]/80">
                    <span className="text-[#5A5D5A] block text-xs">Efectivo</span>
                    <span className="font-bold text-[#242423] font-mono text-sm block mt-0.5 tabular-nums">
                      Bs {(dashData?.todaySales.byPaymentMethod?.cash ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#E8EDDF]/40 border border-[#CFDBD5]/80">
                    <span className="text-[#5A5D5A] block text-xs">QR / Transfer</span>
                    <span className="font-bold text-[#242423] font-mono text-sm block mt-0.5 tabular-nums">
                      Bs {(
                        (dashData?.todaySales.byPaymentMethod?.qr ?? 0) +
                        (dashData?.todaySales.byPaymentMethod?.transfer ?? 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#E8EDDF]/40 border border-[#CFDBD5]/80">
                    <span className="text-[#5A5D5A] block text-xs">Tarjeta</span>
                    <span className="font-bold text-[#242423] font-mono text-sm block mt-0.5 tabular-nums">
                      Bs {(dashData?.todaySales.byPaymentMethod?.card ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between text-xs min-h-[44px]">
                <span className="text-[#5A5D5A]">
                  Ticket promedio:{' '}
                  <strong className="text-[#242423] font-mono">
                    Bs {(dashData?.todaySales.averageTicket ?? 0).toFixed(2)}
                  </strong>
                </span>
                {showAnalytics && <Link
                  to="/analytics"
                  className="font-semibold text-[#5A5D5A] hover:text-[#242423] hover:underline inline-flex items-center gap-1"
                >
                  <span>Ver analíticas</span>
                  <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal rápido de ajuste de stock */}
      {isAdjustModalOpen && storeId && (
        <QuickAdjustmentModal
          storeId={storeId}
          initialVariantId={adjustModalVariantId || undefined}
          onClose={() => {
            setIsAdjustModalOpen(false)
            setAdjustModalVariantId(null)
            refetch()
          }}
        />
      )}

      {/* Modal de auditoría Corte X en vivo */}
      {selectedRegisterIdForCorteX && (
        <CorteXModal
          cashRegisterId={selectedRegisterIdForCorteX}
          storeName={storeName || 'Comercio'}
          onClose={() => setSelectedRegisterIdForCorteX(null)}
        />
      )}
    </div>
  )
}

export default DashboardPage

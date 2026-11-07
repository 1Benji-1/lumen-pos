import { useState, useEffect } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useStorePlan } from '../../shared/hooks/useStorePlan'
import { useAnalytics } from './hooks/useAnalytics'
import { useCashAuditAnalytics } from './hooks/useCashAuditAnalytics'
import { getDateRangeForPeriod } from './utils/dateRanges'
import { KpiCard } from './components/KpiCard'
import { SalesChart } from './components/SalesChart'
import { PaymentMethodsCard } from './components/PaymentMethodsCard'
import { TopProductsTable } from './components/TopProductsTable'
import { CashAuditTab } from './components/CashAuditTab'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import type { AnalyticsPeriod } from '@lumen-pos/types'

type AnalyticsTab = 'commercial' | 'cash_audit'

export function AnalyticsPage() {
  const { storeId, loading: storeLoading } = useStoreId()
  const { data: storePlan } = useStorePlan(storeId)

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('commercial')
  const [period, setPeriod] = useState<AnalyticsPeriod>('30days')
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10))

  const {
    data,
    isLoading: dataLoading,
    isError,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
  } = useAnalytics({
    storeId,
    period,
    customStartDate: customStart,
    customEndDate: customEnd,
  })

  const {
    data: cashAuditData,
    isLoading: cashAuditLoading,
    refetch: refetchCashAudit,
    isRefetching: isCashAuditRefetching,
  } = useCashAuditAnalytics({
    storeId,
    period,
    customStartDate: customStart,
    customEndDate: customEnd,
  })

  const isLoading = dataLoading && !data && !isError

  const rangeInfo = getDateRangeForPeriod(period, customStart, customEnd)

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

  // Validación de fechas cruzadas para que la fecha inicial nunca sea posterior a la final
  function handleStartChange(newStart: string) {
    setCustomStart(newStart)
    if (newStart > customEnd) {
      setCustomEnd(newStart)
    }
  }

  function handleEndChange(newEnd: string) {
    setCustomEnd(newEnd)
    if (newEnd < customStart) {
      setCustomStart(newEnd)
    }
  }

  if (storeLoading) {
    return <LoadingScreen message="Cargando reportes y analíticas..." />
  }

  if (!storeId) {
    return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró la tienda activa.</div>
  }

  const periodOptions: { id: AnalyticsPeriod; label: string }[] = [
    { id: 'today', label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: '7days', label: 'Últimos 7 días' },
    { id: '30days', label: 'Últimos 30 días' },
    { id: 'this_month', label: 'Este mes' },
    { id: 'last_month', label: 'Mes anterior' },
    { id: 'custom', label: 'Personalizado' },
  ]

  const summary = data?.summary

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Selector de Período */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#CFDBD5] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">Reportes y Analíticas</h1>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Métricas de rendimiento comercial, rentabilidad y productos · {rangeInfo.label}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Indicador de última sincronización y botón de actualización */}
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
              onClick={() => {
                refetch()
                refetchCashAudit()
              }}
              disabled={isRefetching || isCashAuditRefetching}
              className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#CFDBD5] hover:bg-[#E8EDDF] text-xs font-semibold text-[#242423] transition disabled:opacity-50 shadow-2xs active:scale-[0.98] cursor-pointer"
              title="Actualizar analíticas"
            >
              <svg
                aria-hidden="true"
                className={`w-4 h-4 ${isRefetching || isCashAuditRefetching ? 'animate-spin text-[#8A6D14]' : 'text-[#5A5D5A]'}`}
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
              <span>{isRefetching || isCashAuditRefetching ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Selector de pestañas de período con áreas táctiles mínimas de 44px */}
            <div className="flex flex-wrap bg-[#E8EDDF]/60 border border-[#CFDBD5] p-1 rounded-lg gap-1">
              {periodOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPeriod(opt.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-md text-xs font-medium transition cursor-pointer inline-flex items-center justify-center ${
                    period === opt.id
                      ? 'bg-[#F5CB5C] text-[#242423] font-semibold shadow-xs'
                      : 'text-[#5A5D5A] hover:text-[#242423] hover:bg-white/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Rango de fechas personalizado con validación cruzada y altura táctil de 44px */}
            {period === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="min-h-[44px] bg-white border border-[#CFDBD5] text-[#242423] rounded-lg px-3 py-2 text-xs shadow-xs focus:outline-none focus:border-[#242423] tabular-nums"
                  aria-label="Fecha de inicio"
                />
                <span className="text-[#5A5D5A] text-xs font-medium">hasta</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(e) => handleEndChange(e.target.value)}
                  className="min-h-[44px] bg-white border border-[#CFDBD5] text-[#242423] rounded-lg px-3 py-2 text-xs shadow-xs focus:outline-none focus:border-[#242423] tabular-nums"
                  aria-label="Fecha de fin"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subpestañas Principales: Rendimiento Comercial vs Auditoría de Cajas */}
      <div className="flex border-b border-[#CFDBD5] gap-8">
        <button
          type="button"
          onClick={() => setActiveTab('commercial')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'commercial'
              ? 'border-[#242423] text-[#242423]'
              : 'border-transparent text-[#5A5D5A] hover:text-[#242423]'
          }`}
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Rendimiento Comercial</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cash_audit')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer relative ${
            activeTab === 'cash_audit'
              ? 'border-[#242423] text-[#242423]'
              : 'border-transparent text-[#5A5D5A] hover:text-[#242423]'
          }`}
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>Auditoría de Cajas y Arqueos</span>
          {cashAuditData && cashAuditData.totalClosedShifts > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] tabular-nums">
              {cashAuditData.totalClosedShifts}
            </span>
          )}
        </button>
      </div>

      {/* Banner de advertencia si falló la recarga en segundo plano pero hay datos previos en caché */}
      {isError && data && (
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
            className="min-h-[44px] self-end sm:self-center px-4 py-2 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-bold rounded-lg text-xs transition shadow-2xs shrink-0 disabled:opacity-50 inline-flex items-center justify-center cursor-pointer"
          >
            {isRefetching ? 'Reintentando...' : 'Reintentar ahora'}
          </button>
        </div>
      )}

      {/* Contenido según la Subpestaña Activa */}
      {activeTab === 'cash_audit' ? (
        <CashAuditTab
          data={cashAuditData}
          isLoading={cashAuditLoading}
          storeName={storePlan?.name}
        />
      ) : (
        <>
          {/* Estado de carga */}
          {isLoading ? (
            <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center text-[#5A5D5A] shadow-xs">
              <svg aria-hidden="true" className="w-8 h-8 animate-spin text-[#8A6D14] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-xs">Calculando analíticas del período...</p>
            </div>
          ) : isError && !data ? (
            /* Tarjeta de error cuando falla la consulta y no hay datos previos */
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
                  No se pudieron cargar las analíticas
                </h2>
                <p className="text-xs text-[#5A5D5A] mt-1.5 max-w-md mx-auto">
                  Ocurrió un problema de conexión al obtener los reportes comerciales de tu tienda. Para proteger la veracidad de tus datos, no mostramos valores en cero que puedan resultar engañosos.
                </p>
                {error && (
                  <p className="text-xs font-mono text-[#BC4749] bg-[#FDF0ED] py-1.5 px-3 rounded-md mt-3 inline-block border border-[#F0B2B4]">
                    {error instanceof Error ? error.message : 'Error de comunicación con el servicio'}
                  </p>
                )}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold rounded-lg transition shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
          ) : data && summary ? (
            <>
              {/* Fila 1: Finanzas y Rentabilidad (Ventas, Costo, Ganancia Real con Hero/Margen) */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <KpiCard
                  title="Ventas Totales"
                  value={`Bs ${summary.total_sales.toFixed(2)}`}
                  subtitle={`${summary.total_orders} venta${summary.total_orders !== 1 ? 's' : ''} completadas`}
                  className="md:col-span-3 lg:col-span-2"
                />
                <KpiCard
                  title="Costo de Mercadería"
                  value={`Bs ${summary.total_cost.toFixed(2)}`}
                  subtitle="Costo de adquisición de stock vendido"
                  className="md:col-span-3 lg:col-span-2"
                />
                <KpiCard
                  title="Ganancia Real"
                  value={`Bs ${summary.gross_profit.toFixed(2)}`}
                  subtitle="Margen bruto neto sobre ventas"
                  highlight={true}
                  badge={`${summary.profit_margin.toFixed(1)}% margen`}
                  className="md:col-span-6 lg:col-span-2"
                />
              </div>

              {/* Fila 2: Operaciones y Canales de Cobro (Ticket Promedio y Transacciones con desglose QR) */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <KpiCard
                  title="Ticket Promedio"
                  value={`Bs ${summary.average_ticket.toFixed(2)}`}
                  subtitle="Gasto medio por venta registrada"
                  className="md:col-span-3"
                />
                {(() => {
                  const cash = data.payment_methods.find((p) => p.method === 'cash')?.total ?? summary.cash_sales ?? 0
                  const qr = data.payment_methods.find((p) => p.method === 'qr')?.total ?? summary.qr_sales ?? 0
                  const card = data.payment_methods.find((p) => p.method === 'card')?.total ?? summary.card_sales ?? 0
                  const transfer = data.payment_methods.find((p) => p.method === 'transfer')?.total ?? summary.transfer_sales ?? 0

                  return (
                    <KpiCard
                      title="Transacciones y Cobros"
                      value={`${summary.total_orders} venta${summary.total_orders !== 1 ? 's' : ''}`}
                      className="md:col-span-3"
                      subtitle={
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#588157]" />
                            <span className="font-semibold text-[#242423]">Efectivo:</span>
                            <span className="tabular-nums">Bs {cash.toFixed(0)}</span>
                          </span>
                          <span className="text-[#CFDBD5]">·</span>
                          <span className="inline-flex items-center gap-1">
                            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#F5CB5C]" />
                            <span className="font-semibold text-[#242423]">QR:</span>
                            <span className="tabular-nums">Bs {qr.toFixed(0)}</span>
                          </span>
                          <span className="text-[#CFDBD5]">·</span>
                          <span className="inline-flex items-center gap-1">
                            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#242423]" />
                            <span className="font-semibold text-[#242423]">Tarjeta:</span>
                            <span className="tabular-nums">Bs {card.toFixed(0)}</span>
                          </span>
                          {transfer > 0 && (
                            <>
                              <span className="text-[#CFDBD5]">·</span>
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#5A5D5A]" />
                                <span className="font-semibold text-[#242423]">Transf:</span>
                                <span className="tabular-nums">Bs {transfer.toFixed(0)}</span>
                              </span>
                            </>
                          )}
                        </div>
                      }
                    />
                  )
                })()}
              </div>

              {/* Sección de Gráficos: Tendencia diaria y Métodos de pago */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SalesChart data={data.daily_sales} />
                </div>
                <div>
                  <PaymentMethodsCard data={data.payment_methods} />
                </div>
              </div>

              {/* Tabla de Productos Más Vendidos */}
              <div>
                <TopProductsTable data={data.top_products} />
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

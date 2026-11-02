import { useState, useMemo } from 'react'
import {
  useCustomers,
  useToggleCustomerActive,
} from '../hooks/useCustomers'
import { PurchaseHistoryModal } from './PurchaseHistoryModal'
import { CustomerModal } from './CustomerModal'
import { StickyTableWrapper } from '../../../shared/components/StickyTableWrapper'
import type { CustomerWithMetrics } from '@lumen-pos/types'

type StatusFilter = 'active' | 'inactive' | 'all'
type SortField = 'name' | 'total_spent' | 'last_purchase_at'
type SortOrder = 'asc' | 'desc'

export function CustomerList({ storeId }: { storeId: string }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const {
    data: customers,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCustomers(storeId, {
    status: statusFilter,
    search: searchTerm,
  })

  // Obtener datos globales de cartera para las tarjetas de resumen
  const { data: allCustomers, isLoading: isAllLoading } = useCustomers(storeId, {
    status: 'all',
  })

  const toggleActive = useToggleCustomerActive(storeId)

  const [selectedCustomerForHistory, setSelectedCustomerForHistory] =
    useState<CustomerWithMetrics | null>(null)
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] =
    useState<CustomerWithMetrics | null>(null)
  const [selectedCustomerForNotes, setSelectedCustomerForNotes] =
    useState<CustomerWithMetrics | null>(null)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)

  const [customerToToggleStatus, setCustomerToToggleStatus] =
    useState<CustomerWithMetrics | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  function handleOpenToggleStatus(customer: CustomerWithMetrics) {
    setToggleError(null)
    setCustomerToToggleStatus(customer)
  }

  async function handleConfirmToggleStatus() {
    if (!customerToToggleStatus) return
    setToggleError(null)
    try {
      await toggleActive.mutateAsync({
        customerId: customerToToggleStatus.id,
        isActive: !customerToToggleStatus.is_active,
      })
      setCustomerToToggleStatus(null)
    } catch (err) {
      setToggleError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al actualizar el estado del cliente.'
      )
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      // Para importes y fechas, el orden por defecto más intuitivo es descendente
      setSortOrder(field === 'name' ? 'asc' : 'desc')
    }
  }

  // Lista ordenada en memoria según la columna seleccionada
  const sortedCustomers = useMemo(() => {
    if (!customers) return []
    return [...customers].sort((a, b) => {
      let comparison = 0
      if (sortField === 'name') {
        comparison = a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' })
      } else if (sortField === 'total_spent') {
        comparison = a.total_spent - b.total_spent
      } else if (sortField === 'last_purchase_at') {
        const timeA = a.last_purchase_at ? new Date(a.last_purchase_at).getTime() : 0
        const timeB = b.last_purchase_at ? new Date(b.last_purchase_at).getTime() : 0
        comparison = timeA - timeB
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [customers, sortField, sortOrder])

  // Métricas agregadas de cartera
  const portfolioCustomers = allCustomers || customers || []
  const totalCustomers = allCustomers ? allCustomers.length : (customers?.length ?? 0)
  const activeCustomers = portfolioCustomers.filter((c) => c.is_active).length
  const inactiveCustomers = totalCustomers - activeCustomers
  const frequentCustomers = portfolioCustomers.filter((c) => c.total_purchases > 1).length
  const totalPortfolioValue = portfolioCustomers.reduce((acc, c) => acc + (c.total_spent || 0), 0)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#CFDBD5] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">Clientes</h1>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Directorio de clientes, preferencias de atención, métricas de recurrencia e historial de compras.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5CB5C] hover:bg-[#E5B946] active:scale-[0.98] text-[#242423] text-xs font-bold rounded-lg shadow-xs transition cursor-pointer min-h-[44px]"
        >
          <svg aria-hidden="true" className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuevo cliente</span>
        </button>
      </div>

      {/* Banner de error de conexión / sincronización */}
      {isError && (
        <div className="p-4 rounded-xl bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] flex items-center justify-between gap-4 flex-wrap shadow-xs">
          <div className="flex items-center gap-3">
            <svg aria-hidden="true" className="w-5 h-5 shrink-0 text-[#BC4749]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs">
              <span className="font-bold">Error de sincronización:</span> No se pudieron obtener los clientes desde el servidor.
              <span className="block text-[#5A5D5A] mt-0.5">{error instanceof Error ? error.message : 'Error de conexión de red.'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="min-h-[44px] px-4 py-2 bg-white hover:bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4] text-xs font-bold rounded-lg transition shadow-2xs active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <svg aria-hidden="true" className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefetching ? 'Reintentando...' : 'Reintentar conexión'}</span>
          </button>
        </div>
      )}

      {/* Franja Superior: Resumen de Cartera (3 Tarjetas) */}
      {isLoading && isAllLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          <div className="h-28 bg-white border border-[#CFDBD5] rounded-xl shadow-xs" />
          <div className="h-28 bg-white border border-[#CFDBD5] rounded-xl shadow-xs" />
          <div className="h-28 bg-white border border-[#CFDBD5] rounded-xl shadow-xs" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total de Clientes */}
          <div className="bg-white border border-[#CFDBD5] rounded-xl p-5 flex flex-col justify-between hover:border-[#242423]/40 transition relative overflow-hidden group shadow-xs">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#EFF5EE] rounded-bl-full pointer-events-none group-hover:bg-[#E2EDE1] transition" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                  Total Clientes
                </span>
                <div className="p-2 rounded-lg bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#242423] tracking-tight font-mono tabular-nums">
                {totalCustomers}
              </div>
              <div className="text-xs text-[#5A5D5A] mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-[#588157] font-mono tabular-nums">
                  {activeCustomers} activos
                </span>
                <span className="text-[#CFDBD5]">•</span>
                <span className="text-[#5A5D5A] font-mono tabular-nums">
                  {inactiveCustomers} inactivos
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between text-xs text-[#5A5D5A]">
              <span>Tasa de actividad:</span>
              <span className="font-semibold text-[#242423] font-mono tabular-nums">
                {totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Card 2: Clientes Frecuentes / Recurrentes */}
          <div className="bg-white border border-[#CFDBD5] rounded-xl p-5 flex flex-col justify-between hover:border-[#242423]/40 transition relative overflow-hidden group shadow-xs">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#FEF9E7] rounded-bl-full pointer-events-none group-hover:bg-[#FCF2D0] transition" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                  Clientes Frecuentes
                </span>
                <div className="p-2 rounded-lg bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/50">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#242423] tracking-tight font-mono tabular-nums">
                {frequentCustomers}
              </div>
              <div className="text-xs text-[#5A5D5A] mt-2 flex items-center gap-1.5">
                <span>Más de 1 compra realizada</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between text-xs text-[#5A5D5A]">
              <span>Tasa de recurrencia:</span>
              <span className="font-semibold text-[#242423] font-mono tabular-nums">
                {totalCustomers > 0 ? Math.round((frequentCustomers / totalCustomers) * 100) : 0}% de la base
              </span>
            </div>
          </div>

          {/* Card 3: Valor Total de la Cartera */}
          <div className="bg-white border border-[#CFDBD5] rounded-xl p-5 flex flex-col justify-between hover:border-[#242423]/40 transition relative overflow-hidden group shadow-xs">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#EFF5EE] rounded-bl-full pointer-events-none group-hover:bg-[#E2EDE1] transition" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                  Valor de Cartera
                </span>
                <div className="p-2 rounded-lg bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#242423] tracking-tight font-mono tabular-nums">
                Bs {totalPortfolioValue.toFixed(2)}
              </div>
              <div className="text-xs text-[#5A5D5A] mt-2 flex items-center gap-1.5">
                <span>Gasto acumulado total</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#CFDBD5] flex items-center justify-between text-xs text-[#5A5D5A]">
              <span>Promedio por cliente:</span>
              <span className="font-semibold text-[#242423] font-mono tabular-nums">
                Bs {totalCustomers > 0 ? (totalPortfolioValue / totalCustomers).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#CFDBD5] p-3 rounded-xl shadow-xs">
        {/* Input de Búsqueda */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A5D5A]">
            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, teléfono, correo o notas..."
            className="w-full bg-[#E8EDDF]/40 border border-[#CFDBD5] rounded-lg pl-9 pr-11 py-2 text-xs text-[#242423] placeholder:text-[#5A5D5A] focus:outline-none focus:border-[#242423] focus:bg-white transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 w-11 h-full min-h-[44px] min-w-[44px] flex items-center justify-center text-[#5A5D5A] hover:text-[#242423] transition cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs de Filtro de Estado */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#E8EDDF]/60 border border-[#CFDBD5] rounded-lg p-1">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-[#242423] font-semibold shadow-xs'
                  : 'text-[#5A5D5A] hover:text-[#242423]'
              }`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-white text-[#242423] font-semibold shadow-xs'
                  : 'text-[#5A5D5A] hover:text-[#242423]'
              }`}
            >
              Inactivos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-[#242423] font-semibold shadow-xs'
                  : 'text-[#5A5D5A] hover:text-[#242423]'
              }`}
            >
              Todos
            </button>
          </div>

          <span className="text-xs text-[#5A5D5A] ml-2 font-mono tabular-nums">
            {sortedCustomers.length} cliente{sortedCustomers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tabla de Clientes con Scroll Sticky y Ordenamiento */}
      {isLoading ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center text-[#5A5D5A] shadow-xs">
          <svg aria-hidden="true" className="w-8 h-8 animate-spin text-[#8A6D14] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-xs">Cargando directorio de clientes...</p>
        </div>
      ) : isError && (!customers || customers.length === 0) ? (
        <div className="bg-white border border-[#F0B2B4] rounded-xl p-12 text-center text-[#5A5D5A] shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#FDF0ED] text-[#BC4749] flex items-center justify-center mx-auto mb-3">
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[#242423]">No se pudo cargar el directorio de clientes</p>
          <p className="text-xs text-[#5A5D5A] mt-1 max-w-sm mx-auto">
            Ocurrió un problema de red o conexión al servidor. Comprueba tu conexión a internet y vuelve a intentar.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="mt-4 min-h-[44px] px-4 py-2 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold rounded-lg shadow-xs transition active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer"
          >
            <svg aria-hidden="true" className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefetching ? 'Reintentando...' : 'Reintentar conexión'}</span>
          </button>
        </div>
      ) : sortedCustomers.length === 0 ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center text-[#5A5D5A] shadow-xs">
          <svg
            aria-hidden="true"
            className="w-12 h-12 text-[#5A5D5A] mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-sm font-semibold text-[#242423]">No se encontraron clientes</p>
          <p className="text-xs text-[#5A5D5A] mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'No hay clientes que coincidan con los criterios de búsqueda especificados.'
              : statusFilter === 'inactive'
              ? 'No hay clientes dados de baja en este momento.'
              : 'Empieza registrando tu primer cliente para hacer seguimiento a sus compras y fidelidad.'}
          </p>
        </div>
      ) : (
        <StickyTableWrapper className="mt-2" maxHeight="max-h-[calc(100vh-280px)]">
          <table className="w-full text-left text-sm text-[#242423]">
            <thead className="table-sticky-header text-[#5A5D5A] text-xs uppercase tracking-wider">
              <tr>
                {/* Columna Nombre / Cliente (Ordenable) */}
                <th scope="col" className="py-3 px-4 font-semibold text-[#242423]">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1.5 py-1 px-1.5 -ml-1.5 rounded hover:bg-[#CFDBD5]/40 transition cursor-pointer select-none group text-[#242423] font-semibold"
                    aria-label={`Ordenar por nombre, actualmente ordenado ${sortField === 'name' ? (sortOrder === 'asc' ? 'ascendente' : 'descendente') : 'no ordenado'}`}
                  >
                    <span>Cliente</span>
                    <span className="text-[#5A5D5A] group-hover:text-[#242423]">
                      {sortField === 'name' ? (
                        sortOrder === 'asc' ? (
                          <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg aria-hidden="true" className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </span>
                  </button>
                </th>

                {/* Columna Contacto */}
                <th scope="col" className="py-3 px-4 font-semibold text-[#242423]">Contacto</th>

                {/* Columna Frecuencia */}
                <th scope="col" className="py-3 px-4 font-semibold text-[#242423] text-center">Frecuencia</th>

                {/* Columna Última compra (Ordenable) */}
                <th scope="col" className="py-3 px-4 font-semibold text-[#242423]">
                  <button
                    type="button"
                    onClick={() => handleSort('last_purchase_at')}
                    className="inline-flex items-center gap-1.5 py-1 px-1.5 -ml-1.5 rounded hover:bg-[#CFDBD5]/40 transition cursor-pointer select-none group text-[#242423] font-semibold"
                    aria-label={`Ordenar por fecha de última compra, actualmente ordenado ${sortField === 'last_purchase_at' ? (sortOrder === 'asc' ? 'ascendente' : 'descendente') : 'no ordenado'}`}
                  >
                    <span>Última compra</span>
                    <span className="text-[#5A5D5A] group-hover:text-[#242423]">
                      {sortField === 'last_purchase_at' ? (
                        sortOrder === 'asc' ? (
                          <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg aria-hidden="true" className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </span>
                  </button>
                </th>

                {/* Columna Total gastado (Ordenable) */}
                <th scope="col" className="py-3 px-4 font-semibold text-[#242423] text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('total_spent')}
                    className="inline-flex items-center gap-1.5 py-1 px-1.5 -mr-1.5 rounded hover:bg-[#CFDBD5]/40 transition cursor-pointer select-none group text-[#242423] font-semibold ml-auto"
                    aria-label={`Ordenar por total gastado, actualmente ordenado ${sortField === 'total_spent' ? (sortOrder === 'asc' ? 'ascendente' : 'descendente') : 'no ordenado'}`}
                  >
                    <span>Total gastado</span>
                    <span className="text-[#5A5D5A] group-hover:text-[#242423]">
                      {sortField === 'total_spent' ? (
                        sortOrder === 'asc' ? (
                          <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg aria-hidden="true" className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </span>
                  </button>
                </th>

                {/* Columna Acciones */}
                <th scope="col" className="py-3 px-4 font-semibold text-[#242423] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBD5]">
              {sortedCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-[#E8EDDF]/20 transition">
                  {/* Nombre y notas expandibles */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#242423] text-sm">{c.full_name}</span>
                      {!c.is_active && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {c.notes && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForNotes(c)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 min-h-[36px] rounded-md text-xs text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] border border-transparent hover:border-[#CFDBD5] transition max-w-xs text-left cursor-pointer group"
                          title="Tocar para leer nota completa"
                        >
                          <svg aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-[#8A6D14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="truncate italic max-w-[170px]">{c.notes}</span>
                          <span className="text-xs text-[#8A6D14] font-semibold underline group-hover:no-underline shrink-0">
                            Ver nota
                          </span>
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Teléfono y Correo */}
                  <td className="py-3.5 px-4 text-xs text-[#5A5D5A]">
                    <div className="text-[#242423] font-mono tabular-nums">
                      {c.phone || <span className="font-sans text-[#5A5D5A] italic">Sin teléfono</span>}
                    </div>
                    {c.email && (
                      <div className="text-[#5A5D5A] text-xs mt-0.5 truncate max-w-[200px]" title={c.email}>
                        {c.email}
                      </div>
                    )}
                  </td>

                  {/* Indicador de Frecuencia de Compra */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold font-mono tabular-nums ${
                        c.total_purchases > 0
                          ? 'bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]'
                          : 'bg-[#E5E5E5] text-[#5A5D5A] border border-[#CFDBD5]'
                      }`}
                    >
                      {c.total_purchases === 1
                        ? '1 compra'
                        : `${c.total_purchases} compras`}
                    </span>
                  </td>

                  {/* Fecha de Última Compra */}
                  <td className="py-3.5 px-4 text-xs text-[#5A5D5A]">
                    {c.last_purchase_at ? (
                      <div>
                        <span className="text-[#242423] font-mono tabular-nums">
                          {new Date(c.last_purchase_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="text-xs text-[#5A5D5A] font-mono tabular-nums">
                          {new Date(c.last_purchase_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#5A5D5A] italic">Nunca</span>
                    )}
                  </td>

                  {/* Total Gastado Acumulado */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#242423] text-sm tabular-nums">
                    Bs {c.total_spent.toFixed(2)}
                  </td>

                  {/* Acciones */}
                  <td className="py-3.5 px-4 text-right text-xs space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForHistory(c)}
                      className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg bg-white hover:bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] transition shadow-2xs cursor-pointer inline-flex items-center justify-center font-medium"
                      title="Ver historial de tickets"
                    >
                      Historial
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForEdit(c)}
                      className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg bg-white hover:bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] transition shadow-2xs cursor-pointer inline-flex items-center justify-center font-medium"
                      title="Editar datos del cliente"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenToggleStatus(c)}
                      className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg transition border shadow-2xs cursor-pointer inline-flex items-center justify-center font-medium ${
                        c.is_active
                          ? 'bg-white hover:bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4]'
                          : 'bg-white hover:bg-[#EFF5EE] text-[#588157] border-[#BBD2B8]'
                      }`}
                      title={c.is_active ? 'Desactivar cliente' : 'Reactivar cliente'}
                    >
                      {c.is_active ? 'Baja' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}

      {/* Modal de Historial de Compras */}
      {selectedCustomerForHistory && (
        <PurchaseHistoryModal
          customer={selectedCustomerForHistory}
          onClose={() => setSelectedCustomerForHistory(null)}
        />
      )}

      {/* Modal de Creación / Edición de Cliente */}
      <CustomerModal
        isOpen={isNewModalOpen || Boolean(selectedCustomerForEdit)}
        onClose={() => {
          setIsNewModalOpen(false)
          setSelectedCustomerForEdit(null)
        }}
        storeId={storeId}
        customerToEdit={selectedCustomerForEdit}
      />

      {/* Modal accesible para expandir y leer la nota completa del cliente */}
      {selectedCustomerForNotes && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notes-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-[#CFDBD5] rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBD5]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/50">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h3 id="notes-dialog-title" className="text-sm font-bold text-[#242423]">Notas del cliente</h3>
                  <p className="text-xs text-[#5A5D5A]">{selectedCustomerForNotes.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForNotes(null)}
                className="w-8 h-8 rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] transition flex items-center justify-center cursor-pointer"
                aria-label="Cerrar notas"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#E8EDDF]/30 border border-[#CFDBD5] rounded-xl p-4 text-[#242423] text-xs leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {selectedCustomerForNotes.notes}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#CFDBD5]">
              <button
                type="button"
                onClick={() => {
                  const customer = selectedCustomerForNotes
                  setSelectedCustomerForNotes(null)
                  setSelectedCustomerForEdit(customer)
                }}
                className="text-xs font-semibold text-[#8A6D14] hover:underline inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer"
              >
                <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Editar notas</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomerForNotes(null)}
                className="min-h-[44px] px-4 py-2 bg-[#E8EDDF] hover:bg-[#CFDBD5] text-[#242423] text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para dar de baja / reactivar cliente */}
      {customerToToggleStatus && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toggle-status-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-[#CFDBD5] rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  customerToToggleStatus.is_active
                    ? 'bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]'
                    : 'bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]'
                }`}
              >
                {customerToToggleStatus.is_active ? (
                  <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                )}
              </div>
              <div className="space-y-1">
                <h3 id="toggle-status-title" className="text-base font-bold text-[#242423]">
                  {customerToToggleStatus.is_active
                    ? 'Dar de baja al cliente'
                    : 'Reactivar cliente'}
                </h3>
                <p className="text-xs text-[#5A5D5A] leading-relaxed">
                  {customerToToggleStatus.is_active ? (
                    <>
                      ¿Deseas dar de baja a <strong className="text-[#242423] font-semibold">{customerToToggleStatus.full_name}</strong>? El cliente quedará inactivo para ventas en mostrador, pero su historial de compras y métricas se conservarán intactos.
                    </>
                  ) : (
                    <>
                      ¿Deseas reactivar a <strong className="text-[#242423] font-semibold">{customerToToggleStatus.full_name}</strong>? Volverá a estar disponible para búsquedas y tickets en el punto de venta.
                    </>
                  )}
                </p>
              </div>
            </div>

            {toggleError && (
              <div className="p-3 rounded-lg bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] text-xs font-medium">
                {toggleError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#CFDBD5]">
              <button
                type="button"
                onClick={() => {
                  setCustomerToToggleStatus(null)
                  setToggleError(null)
                }}
                disabled={toggleActive.isPending}
                className="px-4 py-2 text-xs font-medium text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] rounded-lg transition min-h-[44px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={toggleActive.isPending}
                className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-2 cursor-pointer ${
                  customerToToggleStatus.is_active
                    ? 'bg-[#FDF0ED] hover:bg-[#F9E2DD] text-[#BC4749] border border-[#F0B2B4]'
                    : 'bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423]'
                }`}
              >
                {toggleActive.isPending ? (
                  <span>Procesando...</span>
                ) : customerToToggleStatus.is_active ? (
                  <span>Sí, dar de baja</span>
                ) : (
                  <span>Sí, reactivar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
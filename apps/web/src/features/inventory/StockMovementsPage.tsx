import { useState, useMemo } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useCurrentUserRole } from '../../shared/hooks/useCurrentUserRole'
import { useStaff } from '../staff/hooks/useStaff'
import { useStockMovements } from './hooks/useStockMovements'
import { getDateRangeForPeriod } from '../analytics/utils/dateRanges'
import { InventoryDrawer } from './components/InventoryDrawer'
import { InventoryNavTabs } from './components/InventoryNavTabs'
import { QuickAdjustmentModal } from './components/QuickAdjustmentModal'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import { StickyTableWrapper } from '../../shared/components/StickyTableWrapper'
import {
  STOCK_MOVEMENT_TYPES,
  ROLE_DEFINITIONS,
  type StockMovementType,
  type UserRole,
  type AnalyticsPeriod,
} from '@lumen-pos/types'

type DatePreset = 'today' | '7days' | '30days' | 'this_month' | 'custom' | 'all'

// Símbolos vectoriales SVG limpios (idénticos a la barra lateral de Lumen)
function IconCart({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function IconAdjust({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  )
}

function IconAlertTriangle({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function IconReturn({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  )
}

function IconClipboardCheck({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function IconPackage({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

const BADGE_STYLES: Record<StockMovementType, { badge: string; renderIcon: () => React.ReactNode }> = {
  sale: {
    badge: 'bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]',
    renderIcon: () => <IconCart className="w-3 h-3 text-[#588157]" />,
  },
  manual_adjustment: {
    badge: 'bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5]',
    renderIcon: () => <IconAdjust className="w-3 h-3 text-[#242423]" />,
  },
  waste: {
    badge: 'bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]',
    renderIcon: () => <IconAlertTriangle className="w-3 h-3 text-[#BC4749]" />,
  },
  supplier_return: {
    badge: 'bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/50',
    renderIcon: () => <IconReturn className="w-3 h-3 text-[#8A6D14]" />,
  },
  physical_count: {
    badge: 'bg-[#E8EDDF] text-[#333533] border border-[#CFDBD5]',
    renderIcon: () => <IconClipboardCheck className="w-3 h-3 text-[#333533]" />,
  },
  purchase_order: {
    badge: 'bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]',
    renderIcon: () => <IconPackage className="w-3 h-3 text-[#588157]" />,
  },
}

function formatQuantity(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0'
  const rounded = Math.round((Number(val) + Number.EPSILON) * 100) / 100
  if (Number.isInteger(rounded)) {
    return rounded.toLocaleString('es-BO')
  }
  return rounded.toLocaleString('es-BO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'critical':
      return 'Mermas y pérdidas'
    case 'manual_adjustment':
      return 'Ajustes manuales'
    case 'purchase_order':
      return 'Ingresos por compra'
    case 'sale':
      return 'Ventas POS'
    case 'physical_count':
      return 'Conteo físico'
    case 'supplier_return':
      return 'Devolución proveedor'
    default:
      return type
  }
}

export function StockMovementsPage() {
  const { storeId, loading: storeLoading } = useStoreId()
  const { hasPermission } = useCurrentUserRole()
  const canManageInventory = hasPermission('inventory:manage')

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('30days')

  // Fechas personalizadas (Rango Desde / Hasta)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }, [])
  const [customStartDate, setCustomStartDate] = useState<string>(thirtyDaysAgoStr)
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr)

  const [search, setSearch] = useState('')
  const [focusedVariantId, setFocusedVariantId] = useState<string | null>(null)

  // Consultar miembros del equipo para auditoría de colaboradores
  const { data: staffMembers } = useStaff(storeId)

  // Calcular rango de fechas de consulta
  const dateRange = useMemo(() => {
    if (datePreset === 'all') {
      return { startDate: undefined, endDate: undefined }
    }
    if (datePreset === 'custom') {
      return {
        startDate: customStartDate ? new Date(customStartDate + 'T00:00:00').toISOString() : undefined,
        endDate: customEndDate ? new Date(customEndDate + 'T23:59:59.999').toISOString() : undefined,
      }
    }
    const range = getDateRangeForPeriod(datePreset as AnalyticsPeriod)
    return {
      startDate: range.startDate,
      endDate: range.endDate,
    }
  }, [datePreset, customStartDate, customEndDate])

  // Obtener movimientos de stock con filtros
  const { data: movements, isLoading } = useStockMovements({
    storeId,
    type: selectedType,
    userId: selectedUserId === 'all' ? undefined : selectedUserId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 300,
  })

  // Total de registros encontrados
  const totalMovementsCount = movements?.length ?? 0

  // Identificar información del producto enfocado si existe
  const focusedVariantInfo = useMemo(() => {
    if (!focusedVariantId || !movements) return null
    const target = movements.find((m) => m.variant_id === focusedVariantId)
    return target?.product_variants ?? null
  }, [focusedVariantId, movements])

  // Métricas específicas del producto enfocado (Ficha Kárdex)
  const productKardexMetrics = useMemo(() => {
    if (!focusedVariantId || !movements) {
      return { initialStock: 0, latestStock: 0, inflow: 0, sales: 0, waste: 0, manualNet: 0 }
    }
    const varMovements = movements.filter((m) => m.variant_id === focusedVariantId)
    if (!varMovements.length) {
      return { initialStock: 0, latestStock: 0, inflow: 0, sales: 0, waste: 0, manualNet: 0 }
    }

    const latestStock = Number(varMovements[0].new_stock) || 0
    const initialStock = Number(varMovements[varMovements.length - 1].previous_stock) || 0
    let inflow = 0
    let sales = 0
    let waste = 0
    let manualNet = 0

    for (const m of varMovements) {
      const qty = Number(m.quantity_change) || 0
      if (qty > 0) inflow += qty
      if (m.type === 'sale') sales += Math.abs(qty)
      else if (m.type === 'waste' || m.type === 'supplier_return') waste += Math.abs(qty)
      else if (m.type === 'manual_adjustment') manualNet += qty
    }

    return { initialStock, latestStock, inflow, sales, waste, manualNet }
  }, [focusedVariantId, movements])

  // Filtrado reactivo en cliente (búsqueda y producto enfocado)
  const filteredMovements = useMemo(() => {
    if (!movements) return []
    return movements.filter((m) => {
      if (focusedVariantId && m.variant_id !== focusedVariantId) return false
      if (!search.trim()) return true
      const term = search.toLowerCase()
      const prodName = m.product_variants?.products?.name?.toLowerCase() ?? ''
      const varName = m.product_variants?.name?.toLowerCase() ?? ''
      const barcode = m.product_variants?.barcode?.toLowerCase() ?? ''
      const reason = m.reason?.toLowerCase() ?? ''
      const user = m.users?.full_name?.toLowerCase() ?? ''
      const email = m.users?.email?.toLowerCase() ?? ''
      return (
        prodName.includes(term) ||
        varName.includes(term) ||
        barcode.includes(term) ||
        reason.includes(term) ||
        user.includes(term) ||
        email.includes(term)
      )
    })
  }, [movements, focusedVariantId, search])

  // Determinar si hay filtros activos no predeterminados
  const hasActiveFilters =
    selectedType !== 'all' ||
    selectedUserId !== 'all' ||
    search.trim() !== '' ||
    focusedVariantId !== null ||
    datePreset !== '30days'

  function handleResetAllFilters() {
    setSelectedType('all')
    setSelectedUserId('all')
    setDatePreset('30days')
    setSearch('')
    setFocusedVariantId(null)
  }

  // Nombre del colaborador seleccionado para el chip
  const selectedStaffMember = useMemo(() => {
    if (selectedUserId === 'all' || !staffMembers) return null
    return staffMembers.find((m) => m.id === selectedUserId)
  }, [selectedUserId, staffMembers])

  if (storeLoading) return <LoadingScreen message="Cargando historial de movimientos..." />
  if (!storeId) {
    return (
      <div className="text-[#BC4749] p-8 text-sm text-center">
        No se encontró tu tienda asociada.
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-inventory-view">
      <InventoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#242423] tracking-tight">
              Kárdex y Auditoría de Stock
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5]">
              {totalMovementsCount} registros
            </span>
          </div>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Trazabilidad operacional completa: ventas en mostrador, mermas, órdenes de compra y control de colaboradores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageInventory ? (
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(true)}
              className="h-10 px-4 rounded-md bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-semibold flex items-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajuste manual de stock
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#E8EDDF]/60 border border-[#CFDBD5] rounded-md text-xs text-[#5A5D5A]">
              <svg className="w-4 h-4 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Modo auditoría (solo lectura)</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-navegación de Inventario */}
      <InventoryNavTabs />

      {/* Ficha Kárdex del Producto Enfocado (si se seleccionó un artículo específico) */}
      {focusedVariantInfo && (
        <div className="bg-white border-2 border-[#242423]/20 rounded-xl p-4 sm:p-5 shadow-xs transition-all space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#CFDBD5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8EDDF] border border-[#CFDBD5] flex items-center justify-center text-[#242423] shrink-0">
                <IconPackage className="w-5 h-5 text-[#242423]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                    Kárdex Individual:
                  </span>
                  <h2 className="text-base font-bold text-[#242423]">
                    {focusedVariantInfo.products?.name ?? 'Producto'}
                  </h2>
                  {focusedVariantInfo.name && focusedVariantInfo.name !== 'Único' && (
                    <span className="text-xs bg-[#E8EDDF] text-[#242423] px-2 py-0.5 rounded font-medium">
                      {focusedVariantInfo.name}
                    </span>
                  )}
                  {focusedVariantInfo.barcode && (
                    <span className="text-xs font-mono text-[#5A5D5A] bg-[#E8EDDF]/50 px-2 py-0.5 rounded border border-[#CFDBD5]/40">
                      {focusedVariantInfo.barcode}
                    </span>
                  )}
                  <span className="text-xs text-[#588157] font-semibold bg-[#EFF5EE] px-2 py-0.5 rounded border border-[#BBD2B8]">
                    Unidad: {focusedVariantInfo.unit ?? 'u'}
                  </span>
                </div>
                <p className="text-xs text-[#5A5D5A] mt-0.5">
                  Trazabilidad cronológica y balance de existencias de este artículo en el período seleccionado.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFocusedVariantId(null)}
              className="self-start sm:self-auto text-xs text-[#5A5D5A] hover:text-[#242423] border border-[#CFDBD5] hover:border-[#242423] px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Ver todos los productos
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#E8EDDF]/30 rounded-lg p-3 border border-[#CFDBD5]/60">
              <span className="text-[11px] text-[#5A5D5A] font-medium block">Stock Inicial Período</span>
              <span className="text-base sm:text-lg font-bold font-mono text-[#242423] tabular-nums mt-0.5 block">
                {formatQuantity(productKardexMetrics.initialStock)} {focusedVariantInfo.unit}
              </span>
            </div>

            <div className="bg-[#EFF5EE] rounded-lg p-3 border border-[#BBD2B8]">
              <span className="text-[11px] text-[#588157] font-semibold block">Total Entradas</span>
              <span className="text-base sm:text-lg font-bold font-mono text-[#588157] tabular-nums mt-0.5 block">
                +{formatQuantity(productKardexMetrics.inflow)} {focusedVariantInfo.unit}
              </span>
            </div>

            <div className="bg-[#E8EDDF]/40 rounded-lg p-3 border border-[#CFDBD5]/60">
              <span className="text-[11px] text-[#242423] font-medium block">Salidas Ventas POS</span>
              <span className="text-base sm:text-lg font-bold font-mono text-[#242423] tabular-nums mt-0.5 block">
                −{formatQuantity(productKardexMetrics.sales)} {focusedVariantInfo.unit}
              </span>
            </div>

            <div
              className={`rounded-lg p-3 border ${
                productKardexMetrics.waste > 0 ? 'bg-[#FDF0ED] border-[#F0B2B4]' : 'bg-[#E8EDDF]/30 border-[#CFDBD5]/60'
              }`}
            >
              <span
                className={`text-[11px] font-medium block ${
                  productKardexMetrics.waste > 0 ? 'text-[#BC4749] font-bold' : 'text-[#5A5D5A]'
                }`}
              >
                Mermas / Pérdidas
              </span>
              <span
                className={`text-base sm:text-lg font-bold font-mono tabular-nums mt-0.5 block ${
                  productKardexMetrics.waste > 0 ? 'text-[#BC4749]' : 'text-[#5A5D5A]'
                }`}
              >
                −{formatQuantity(productKardexMetrics.waste)} {focusedVariantInfo.unit}
              </span>
            </div>

            <div className="bg-white rounded-lg p-3 border-2 border-[#242423] shadow-2xs">
              <span className="text-[11px] text-[#242423] font-bold block uppercase tracking-wider">
                Stock Actual Real
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-[#242423] tabular-nums mt-0.5 block">
                {formatQuantity(Number(focusedVariantInfo.stock_quantity ?? productKardexMetrics.latestStock))} {focusedVariantInfo.unit}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros Unificada (Ergonómica y sin saturación visual) */}
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs space-y-3">
        {/* Fila principal: Buscador y Selectores alineados con altura uniforme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Buscador de texto */}
          <div className="lg:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A5D5A]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              aria-label="Buscar movimientos de stock"
              placeholder="Buscar producto, código, motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-lg pl-9 pr-8 text-xs text-[#242423] placeholder-[#5A5D5A] focus:outline-none focus:border-[#242423] focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#5A5D5A] hover:text-[#242423] cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Selector de Tipo de Movimiento */}
          <div className="lg:col-span-3">
            <label htmlFor="type-select" className="sr-only">Tipo de movimiento</label>
            <select
              id="type-select"
              aria-label="Filtrar por tipo de movimiento"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-10 bg-white border border-[#CFDBD5] rounded-lg px-3 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer font-medium"
            >
              <option value="all">Tipo: Todos los movimientos</option>
              <option value="critical">Tipo: Mermas y pérdidas</option>
              <option value="manual_adjustment">Tipo: Ajustes manuales</option>
              <option value="purchase_order">Tipo: Ingresos por compra</option>
              <option value="sale">Tipo: Ventas POS en mostrador</option>
              <option value="physical_count">Tipo: Conteo físico</option>
              <option value="supplier_return">Tipo: Devolución proveedor</option>
            </select>
          </div>

          {/* Selector de Período (con opción de rango personalizado) */}
          <div className="lg:col-span-3">
            <label htmlFor="period-select" className="sr-only">Período de tiempo</label>
            <select
              id="period-select"
              aria-label="Filtrar por período"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full h-10 bg-white border border-[#CFDBD5] rounded-lg px-3 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer font-medium"
            >
              <option value="today">Período: Hoy</option>
              <option value="7days">Período: Últimos 7 días</option>
              <option value="30days">Período: Últimos 30 días</option>
              <option value="this_month">Período: Este mes</option>
              <option value="custom">Período: Rango de fechas (desde / hasta)...</option>
              <option value="all">Período: Histórico completo</option>
            </select>
          </div>

          {/* Selector de Responsable / Colaborador */}
          <div className="lg:col-span-2">
            <label htmlFor="staff-filter-select" className="sr-only">Responsable</label>
            <select
              id="staff-filter-select"
              aria-label="Filtrar por responsable"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full h-10 bg-white border border-[#CFDBD5] rounded-lg px-3 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer font-medium truncate"
            >
              <option value="all">Resp: Todos</option>
              {staffMembers?.map((member) => {
                const roleDef = ROLE_DEFINITIONS[member.role as UserRole]
                const roleLabel = roleDef ? roleDef.shortLabel : member.role
                return (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email} ({roleLabel})
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Fila secundaria condicional: Selectores Desde / Hasta para rango personalizado */}
        {datePreset === 'custom' && (
          <div className="pt-3 border-t border-[#CFDBD5]/50 flex flex-wrap items-center gap-4 bg-[#E8EDDF]/20 -mx-4 -mb-4 p-3.5 rounded-b-xl animate-fade-in">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#242423]">
              <svg className="w-4 h-4 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Definir rango personalizado:</span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="custom-start-date" className="text-xs text-[#5A5D5A] font-medium">
                Desde:
              </label>
              <input
                type="date"
                id="custom-start-date"
                aria-label="Fecha inicial"
                value={customStartDate}
                max={customEndDate || undefined}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-9 bg-white border border-[#CFDBD5] rounded-md px-2.5 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="custom-end-date" className="text-xs text-[#5A5D5A] font-medium">
                Hasta:
              </label>
              <input
                type="date"
                id="custom-end-date"
                aria-label="Fecha final"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-9 bg-white border border-[#CFDBD5] rounded-md px-2.5 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Fila de Filtros Activos (insignias discretas que permiten descartar filtros individuales) */}
        {hasActiveFilters && (
          <div className="pt-2.5 border-t border-[#CFDBD5]/40 flex items-center justify-between gap-2 flex-wrap text-xs text-[#5A5D5A]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#5A5D5A]">Filtros aplicados:</span>

              {selectedType !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                  <span>Tipo: {getTypeLabel(selectedType)}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedType('all')}
                    aria-label="Quitar filtro de tipo"
                    className="hover:text-[#BC4749] cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {selectedUserId !== 'all' && selectedStaffMember && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                  <span>Responsable: {selectedStaffMember.full_name || selectedStaffMember.email}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId('all')}
                    aria-label="Quitar filtro de responsable"
                    className="hover:text-[#BC4749] cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {search.trim() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                  <span>Búsqueda: "{search}"</span>
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Quitar filtro de búsqueda"
                    className="hover:text-[#BC4749] cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {focusedVariantId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F5CB5C]/30 text-[#242423] text-xs font-semibold border border-[#F5CB5C]/50">
                  <span>Artículo individual enfocado</span>
                  <button
                    type="button"
                    onClick={() => setFocusedVariantId(null)}
                    aria-label="Quitar enfoque de producto"
                    className="hover:text-[#BC4749] cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-xs font-semibold text-[#BC4749] hover:underline cursor-pointer"
            >
              Restablecer todo
            </button>
          </div>
        )}
      </div>

      {/* Tabla de movimientos Kárdex */}
      {isLoading ? (
        <div className="text-[#5A5D5A] py-12 text-center text-sm bg-white rounded-xl border border-[#CFDBD5]">
          Cargando auditoría de movimientos...
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E8EDDF] flex items-center justify-center text-[#5A5D5A]">
            <IconClipboardCheck className="w-6 h-6 text-[#5A5D5A]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#242423]">No se encontraron movimientos</h3>
            <p className="text-xs text-[#5A5D5A] mt-1 max-w-md mx-auto">
              No hay registros con los filtros actuales (tipo, colaborador, rango de fechas o búsqueda).
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-xs font-semibold text-[#242423] underline hover:text-[#5A5D5A] cursor-pointer"
            >
              Restablecer todos los filtros
            </button>
          )}
        </div>
      ) : (
        <StickyTableWrapper>
          <table className="w-full text-left text-sm">
            <thead className="table-sticky-header text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider bg-[#F7F9F6] border-b border-[#CFDBD5]">
              <tr>
                <th scope="col" className="py-3 px-4">Fecha y hora</th>
                <th scope="col" className="py-3 px-4">Producto y Código</th>
                <th scope="col" className="py-3 px-4">Tipo</th>
                <th scope="col" className="py-3 px-4 text-right">Variación</th>
                <th scope="col" className="py-3 px-4 text-right">Previo → Nuevo</th>
                <th scope="col" className="py-3 px-4">Motivo / Glosa</th>
                <th scope="col" className="py-3 px-4">Responsable</th>
                <th scope="col" className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBD5]/40 text-xs bg-white">
              {filteredMovements.map((mov) => {
                const date = new Date(mov.created_at)
                const typeKey = mov.type as StockMovementType
                const typeConfig = STOCK_MOVEMENT_TYPES[typeKey] ?? {
                  label: mov.type,
                  badgeColor: 'bg-[#E8EDDF] text-[#242423]',
                }
                const badgeInfo = BADGE_STYLES[typeKey] || {
                  badge: 'bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5]',
                  renderIcon: () => null,
                }
                const isPositive = Number(mov.quantity_change) > 0
                const unit = mov.product_variants?.unit ?? 'u'

                const userRole = mov.users?.role as UserRole | undefined
                const roleDef = userRole ? ROLE_DEFINITIONS[userRole] : null
                const roleLabel = roleDef ? roleDef.shortLabel : userRole

                const isCurrentFocused = focusedVariantId === mov.variant_id

                return (
                  <tr
                    key={mov.id}
                    className={`hover:bg-[#E8EDDF]/20 transition ${
                      isCurrentFocused ? 'bg-[#F5CB5C]/10' : ''
                    }`}
                  >
                    {/* Fecha y hora */}
                    <td className="py-3 px-4 text-[#5A5D5A] font-mono tabular-nums whitespace-nowrap">
                      <div>{date.toLocaleDateString()}</div>
                      <div className="text-[10px] text-[#5A5D5A]/80">
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    {/* Producto */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-[#242423]">
                        {mov.product_variants?.products?.name ?? 'Producto eliminado'}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {mov.product_variants?.name && mov.product_variants.name !== 'Único' && (
                          <span className="text-[11px] text-[#5A5D5A] bg-[#E8EDDF]/60 px-1.5 py-0.2 rounded font-medium">
                            {mov.product_variants.name}
                          </span>
                        )}
                        {mov.product_variants?.barcode && (
                          <span className="text-[10px] font-mono text-[#5A5D5A]">
                            {mov.product_variants.barcode}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tipo de movimiento */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeInfo.badge}`}
                      >
                        {badgeInfo.renderIcon()}
                        <span>{typeConfig.label}</span>
                      </span>
                    </td>

                    {/* Variación */}
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                      <span className={isPositive ? 'text-[#588157]' : 'text-[#BC4749]'}>
                        {isPositive ? `+${formatQuantity(Number(mov.quantity_change))}` : `−${formatQuantity(Math.abs(Number(mov.quantity_change)))}`} {unit}
                      </span>
                    </td>

                    {/* Previo -> Nuevo */}
                    <td className="py-3 px-4 text-right font-mono text-[#5A5D5A] tabular-nums whitespace-nowrap">
                      <span>{formatQuantity(Number(mov.previous_stock))}</span>
                      <span className="mx-1 text-[#CFDBD5]">→</span>
                      <span className="text-[#242423] font-semibold">{formatQuantity(Number(mov.new_stock))}</span>
                    </td>

                    {/* Motivo */}
                    <td className="py-3 px-4 text-[#333533] max-w-[200px] truncate" title={mov.reason ?? ''}>
                      {mov.reason || '—'}
                    </td>

                    {/* Responsable / Colaborador */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#E8EDDF] border border-[#CFDBD5] flex items-center justify-center text-[10px] font-bold text-[#242423] shrink-0">
                          {getInitials(mov.users?.full_name || mov.users?.email)}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-[#242423]">
                            {mov.users?.full_name || mov.users?.email || 'Sistema'}
                          </div>
                          {roleLabel && (
                            <span className="text-[10px] text-[#5A5D5A] block leading-none">
                              {roleLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Acción / Enfocar Kárdex */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          setFocusedVariantId((prev) => (prev === mov.variant_id ? null : mov.variant_id))
                        }
                        title={isCurrentFocused ? 'Quitar filtro individual' : 'Auditar este producto en Kárdex'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                          isCurrentFocused
                            ? 'bg-[#242423] text-white border-[#242423]'
                            : 'bg-white hover:bg-[#E8EDDF]/50 text-[#5A5D5A] hover:text-[#242423] border-[#CFDBD5]'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{isCurrentFocused ? 'Activo' : 'Ver Kárdex'}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}

      {/* Modal de Ajuste Rápido */}
      {isAdjustModalOpen && (
        <QuickAdjustmentModal
          storeId={storeId}
          onClose={() => setIsAdjustModalOpen(false)}
        />
      )}
    </div>
  )
}

export default StockMovementsPage

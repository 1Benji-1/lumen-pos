import { useState, useMemo } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
} from './hooks/usePurchaseOrders'
import { useSuppliers } from './hooks/useSuppliers'
import { useProducts } from './hooks/useProducts'
import { InventoryDrawer } from './components/InventoryDrawer'
import { InventoryNavTabs } from './components/InventoryNavTabs'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import { StickyTableWrapper } from '../../shared/components/StickyTableWrapper'
import { useStoreSettings } from '../settings/hooks/useStoreSettings'
import { getDateRangeForPeriod } from '../analytics/utils/dateRanges'
import {
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type AnalyticsPeriod,
} from '@lumen-pos/types'

interface OrderItemForm {
  variantId: string
  quantity: string
  costPrice: string
}

type DatePreset = 'today' | '7days' | '30days' | 'this_month' | 'custom' | 'all'

const DATE_PRESET_OPTIONS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7days', label: 'Últimos 7 días' },
  { id: '30days', label: 'Últimos 30 días' },
  { id: 'this_month', label: 'Este mes' },
  { id: 'custom', label: 'Rango de fechas (desde / hasta)...' },
  { id: 'all', label: 'Histórico completo' },
]

const STATUS_BADGES: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-[#E8EDDF] text-[#333533] border border-[#CFDBD5]' },
  pending: { label: 'Pendiente', className: 'bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/50' },
  received: { label: 'Recibida', className: 'bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]' },
  cancelled: { label: 'Cancelada', className: 'bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]' },
}

function getStatusLabel(st: string): string {
  switch (st) {
    case 'pending':
      return 'Pendientes'
    case 'received':
      return 'Recibidas'
    case 'draft':
      return 'Borradores'
    case 'cancelled':
      return 'Canceladas'
    default:
      return st
  }
}

export function PurchaseOrdersPage() {
  const { storeId, loading } = useStoreId()
  const { data: settings } = useStoreSettings(storeId)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { data: orders, isLoading } = usePurchaseOrders(storeId)
  const { data: suppliers } = useSuppliers(storeId)
  const { data: products } = useProducts(storeId)

  const createOrder = useCreatePurchaseOrder(storeId)
  const receiveOrder = useReceivePurchaseOrder(storeId)
  const cancelOrder = useCancelPurchaseOrder(storeId)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOrder, setDetailModalOrder] = useState<PurchaseOrder | null>(null)

  // Estados de Filtros y Búsqueda
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }, [])
  const [customStartDate, setCustomStartDate] = useState<string>(thirtyDaysAgoStr)
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr)

  // Creation form state
  const [supplierId, setSupplierId] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<OrderItemForm[]>([])
  const [error, setError] = useState<string | null>(null)

  const allVariants = (products ?? []).flatMap((p) =>
    p.product_variants.map((v) => ({
      ...v,
      productName: p.name,
    }))
  )

  function openCreateModal() {
    const prefix = settings?.purchase_order_prefix?.trim() || 'OC-'
    const nextNumber = `${prefix}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    setSupplierId('')
    setOrderNumber(nextNumber)
    setNotes('')
    setItems([{ variantId: '', quantity: '1', costPrice: '0' }])
    setError(null)
    setCreateModalOpen(true)
  }

  function handleAddItemRow() {
    setItems((prev) => [...prev, { variantId: '', quantity: '1', costPrice: '0' }])
  }

  function handleRemoveItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleItemChange(index: number, field: keyof OrderItemForm, value: string) {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it
        const updated = { ...it, [field]: value }
        if (field === 'variantId') {
          const found = allVariants.find((v) => v.id === value)
          if (found) {
            updated.costPrice = String(found.cost_price)
          }
        }
        return updated
      })
    )
  }

  const orderTotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity) || 0
    const cost = Number(it.costPrice) || 0
    return sum + qty * cost
  }, 0)

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!supplierId) {
      setError('Seleccione un proveedor')
      return
    }

    const validItems = items.filter((it) => it.variantId && Number(it.quantity) > 0)
    if (validItems.length === 0) {
      setError('Agregue al menos un producto con cantidad válida')
      return
    }

    try {
      await createOrder.mutateAsync({
        supplierId,
        orderNumber,
        notes: notes.trim() || undefined,
        items: validItems.map((it) => ({
          variantId: it.variantId,
          quantity: Number(it.quantity),
          costPrice: Number(it.costPrice) || 0,
        })),
      })
      setCreateModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden de compra')
    }
  }

  async function handleReceive(order: PurchaseOrder) {
    if (
      window.confirm(
        `¿Confirmar la recepción de la orden ${order.order_number}? El inventario de los productos se actualizará automáticamente.`
      )
    ) {
      try {
        await receiveOrder.mutateAsync(order.id)
        if (detailModalOrder?.id === order.id) {
          setDetailModalOrder(null)
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al recibir la orden')
      }
    }
  }

  async function handleCancel(order: PurchaseOrder) {
    if (window.confirm(`¿Desea cancelar la orden de compra ${order.order_number}?`)) {
      try {
        await cancelOrder.mutateAsync(order.id)
        if (detailModalOrder?.id === order.id) {
          setDetailModalOrder(null)
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al cancelar la orden')
      }
    }
  }

  // Rango de fechas para el filtro
  const dateRange = useMemo(() => {
    if (datePreset === 'all') return { startDate: undefined, endDate: undefined }
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

  // Filtrado reactivo de órdenes
  const filteredOrders = useMemo(() => {
    if (!orders) return []
    return orders.filter((order) => {
      // 1. Estado
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false
      }

      // 2. Proveedor
      if (selectedSupplierId !== 'all' && order.supplier_id !== selectedSupplierId) {
        return false
      }

      // 3. Rango de fechas
      const orderTime = new Date(order.ordered_at || (order as any).created_at).getTime()
      if (dateRange.startDate) {
        const start = new Date(dateRange.startDate).getTime()
        if (orderTime < start) return false
      }
      if (dateRange.endDate) {
        const end = new Date(dateRange.endDate).getTime()
        if (orderTime > end) return false
      }

      // 4. Texto de búsqueda
      if (search.trim()) {
        const term = search.toLowerCase().trim()
        const matchNumber = order.order_number?.toLowerCase().includes(term)
        const matchSupplier = order.suppliers?.name?.toLowerCase().includes(term)
        const matchNotes = order.notes?.toLowerCase().includes(term)
        if (!matchNumber && !matchSupplier && !matchNotes) {
          return false
        }
      }

      return true
    })
  }, [orders, selectedStatus, selectedSupplierId, dateRange, search])

  const hasActiveFilters =
    selectedStatus !== 'all' ||
    selectedSupplierId !== 'all' ||
    datePreset !== 'all' ||
    search.trim() !== ''

  function handleResetFilters() {
    setSelectedStatus('all')
    setSelectedSupplierId('all')
    setDatePreset('all')
    setSearch('')
  }

  const selectedSupplierName = useMemo(() => {
    if (selectedSupplierId === 'all' || !suppliers) return null
    return suppliers.find((s) => s.id === selectedSupplierId)?.name ?? null
  }, [selectedSupplierId, suppliers])

  if (loading || isLoading) return <LoadingScreen message="Cargando órdenes de compra..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-inventory-view">
      <InventoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#242423] tracking-tight">Órdenes de compra</h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5]">
              {orders?.length ?? 0} registradas
            </span>
          </div>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Gestión formal de pedidos a proveedores: emisión, control de costos y recepción automática en existencias.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="h-10 px-4 rounded-md bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-semibold flex items-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-xs cursor-pointer"
        >
          <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva orden de compra
        </button>
      </div>

      {/* Sub-navegación de Inventario */}
      <InventoryNavTabs />

      {/* Barra de Filtros y Búsqueda Unificada */}
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs space-y-3">
        {/* Fila principal: Grid de 12 columnas con altura uniforme (h-10) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* 1. Buscador */}
          <div className="lg:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A5D5A]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              aria-label="Buscar órdenes de compra"
              placeholder="Buscar por N° orden, proveedor o notas..."
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

          {/* 2. Filtro por Estado */}
          <div className="lg:col-span-3">
            <label htmlFor="status-order-select" className="sr-only">Filtrar por estado</label>
            <select
              id="status-order-select"
              aria-label="Filtrar por estado"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 bg-white border border-[#CFDBD5] rounded-lg px-3 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer font-medium"
            >
              <option value="all">Estado: Todos los estados</option>
              <option value="pending">Estado: Pendientes</option>
              <option value="received">Estado: Recibidas</option>
              <option value="draft">Estado: Borradores</option>
              <option value="cancelled">Estado: Canceladas</option>
            </select>
          </div>

          {/* 3. Filtro por Proveedor */}
          <div className="lg:col-span-3">
            <label htmlFor="supplier-order-select" className="sr-only">Filtrar por proveedor</label>
            <select
              id="supplier-order-select"
              aria-label="Filtrar por proveedor"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full h-10 bg-white border border-[#CFDBD5] rounded-lg px-3 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer font-medium truncate"
            >
              <option value="all">Proveedor: Todos</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  Proveedor: {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filtro por Período */}
          <div className="lg:col-span-2">
            <label htmlFor="period-order-select" className="sr-only">Filtrar por período</label>
            <select
              id="period-order-select"
              aria-label="Filtrar por período"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full h-10 bg-white border border-[#CFDBD5] rounded-lg px-3 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer font-medium"
            >
              <option value="all">Período: Histórico</option>
              <option value="today">Período: Hoy</option>
              <option value="7days">Período: 7 días</option>
              <option value="30days">Período: 30 días</option>
              <option value="this_month">Período: Este mes</option>
              <option value="custom">Período: Rango...</option>
            </select>
          </div>
        </div>

        {/* Fila condicional: Rango personalizado Desde / Hasta */}
        {datePreset === 'custom' && (
          <div className="pt-3 border-t border-[#CFDBD5]/50 flex flex-wrap items-center gap-4 bg-[#E8EDDF]/20 -mx-4 -mb-4 p-3.5 rounded-b-xl animate-fade-in">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#242423]">
              <svg className="w-4 h-4 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Rango de fechas de emisión:</span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="custom-start-order" className="text-xs text-[#5A5D5A] font-medium">
                Desde:
              </label>
              <input
                type="date"
                id="custom-start-order"
                aria-label="Fecha inicial"
                value={customStartDate}
                max={customEndDate || undefined}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-9 bg-white border border-[#CFDBD5] rounded-md px-2.5 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="custom-end-order" className="text-xs text-[#5A5D5A] font-medium">
                Hasta:
              </label>
              <input
                type="date"
                id="custom-end-order"
                aria-label="Fecha final"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-9 bg-white border border-[#CFDBD5] rounded-md px-2.5 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Fila secundaria: Resumen y Filtros activos */}
        <div className="pt-2.5 border-t border-[#CFDBD5]/40 flex items-center justify-between gap-3 flex-wrap text-xs text-[#5A5D5A]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-[#242423] bg-[#E8EDDF] px-2 py-0.5 rounded border border-[#CFDBD5]">
              {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''}
            </span>

            {/* Chips de filtros activos */}
            {hasActiveFilters && (
              <>
                <span className="text-[11px] text-[#5A5D5A] ml-1">Filtros aplicados:</span>

                {selectedStatus !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                    <span>Estado: {getStatusLabel(selectedStatus)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus('all')}
                      aria-label="Quitar filtro de estado"
                      className="hover:text-[#BC4749] cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}

                {selectedSupplierId !== 'all' && selectedSupplierName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                    <span>Proveedor: {selectedSupplierName}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplierId('all')}
                      aria-label="Quitar filtro de proveedor"
                      className="hover:text-[#BC4749] cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}

                {datePreset !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                    <span>
                      {datePreset === 'custom'
                        ? `${customStartDate} → ${customEndDate}`
                        : DATE_PRESET_OPTIONS.find((o) => o.id === datePreset)?.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDatePreset('all')}
                      aria-label="Restablecer filtro de período"
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
              </>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#BC4749] hover:underline cursor-pointer"
            >
              Restablecer todo
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Órdenes */}
      {isLoading ? (
        <div className="text-[#5A5D5A] py-12 text-center text-sm bg-white rounded-xl border border-[#CFDBD5]">
          Cargando órdenes de compra...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E8EDDF] flex items-center justify-center text-[#5A5D5A]">
            <svg className="w-6 h-6 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#242423]">No se encontraron órdenes de compra</h3>
            <p className="text-[#5A5D5A] text-xs max-w-md mx-auto mt-1">
              {hasActiveFilters
                ? 'Ninguna orden coincide con los filtros aplicados (estado, proveedor, fechas o búsqueda).'
                : 'No se encontraron órdenes de compra registradas en el sistema.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#242423] underline hover:text-[#5A5D5A] cursor-pointer"
            >
              Restablecer todos los filtros
            </button>
          )}
        </div>
      ) : (
        <StickyTableWrapper>
          <table className="w-full text-left text-sm">
            <thead className="table-sticky-header bg-[#F7F9F6] text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider border-b border-[#CFDBD5]">
              <tr>
                <th scope="col" className="py-3 px-4">Orden</th>
                <th scope="col" className="py-3 px-4">Proveedor</th>
                <th scope="col" className="py-3 px-4">Estado</th>
                <th scope="col" className="py-3 px-4">Fecha de emisión</th>
                <th scope="col" className="py-3 px-4">Fecha de recepción</th>
                <th scope="col" className="py-3 px-4 text-right">Total (Bs)</th>
                <th scope="col" className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBD5]/40 text-xs bg-white">
              {filteredOrders.map((order) => {
                const statusKey = order.status as PurchaseOrderStatus
                const statusConfig = STATUS_BADGES[statusKey] ?? {
                  label: order.status,
                  className: 'bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5]',
                }

                return (
                  <tr key={order.id} className="hover:bg-[#E8EDDF]/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#242423]">
                      {order.order_number}
                    </td>

                    <td className="py-3 px-4 font-medium text-[#242423]">
                      {order.suppliers?.name ?? 'Proveedor eliminado'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#5A5D5A] font-mono tabular-nums whitespace-nowrap">
                      {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3 px-4 text-[#5A5D5A] font-mono tabular-nums whitespace-nowrap">
                      {order.received_at
                        ? new Date(order.received_at).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-[#242423] tabular-nums whitespace-nowrap">
                      Bs {Number(order.total_cost).toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDetailModalOrder(order)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-[#E8EDDF]/50 border border-[#CFDBD5] text-[#242423] text-xs font-medium transition shadow-2xs cursor-pointer"
                      >
                        Ver detalle
                      </button>

                      {order.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleReceive(order)}
                          disabled={receiveOrder.isPending}
                          className="px-2.5 py-1 rounded bg-[#EFF5EE] hover:bg-[#BBD2B8]/40 border border-[#BBD2B8] text-[#588157] text-xs font-medium transition disabled:opacity-50 shadow-2xs cursor-pointer"
                        >
                          Recibir
                        </button>
                      )}

                      {(order.status === 'pending' || order.status === 'draft') && (
                        <button
                          type="button"
                          onClick={() => handleCancel(order)}
                          disabled={cancelOrder.isPending}
                          className="px-2.5 py-1 rounded hover:bg-[#FDF0ED] border border-transparent hover:border-[#F0B2B4] text-[#BC4749] text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}

      {/* Modal Nueva Orden de Compra */}
      {createModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalOpen(false)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 overflow-y-auto animate-modal-backdrop"
        >
          <div className="bg-white border border-[#CFDBD5] rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 text-[#242423] my-8 animate-modal-panel">
            <div className="flex justify-between items-center border-b border-[#CFDBD5] pb-3">
              <h3 className="font-bold text-base text-[#242423]">Nueva orden de compra</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded-lg hover:bg-[#E8EDDF] transition cursor-pointer"
                aria-label="Cerrar modal"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                    Proveedor *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                    className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-xs focus:outline-none focus:border-[#242423]"
                  >
                    <option value="">Seleccione proveedor...</option>
                    {suppliers?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                    Número de orden *
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                    className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-xs font-mono focus:outline-none focus:border-[#242423]"
                  />
                </div>
              </div>

              {/* Items de la orden */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-[#5A5D5A] uppercase tracking-wider">
                    Artículos solicitados
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[#242423] font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    + Agregar ítem
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {items.map((row, idx) => {
                    const rowSubtotal = (Number(row.quantity) || 0) * (Number(row.costPrice) || 0)
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center bg-[#E8EDDF]/30 p-2.5 rounded-lg border border-[#CFDBD5]/60"
                      >
                        <div className="col-span-5">
                          <select
                            value={row.variantId}
                            onChange={(e) => handleItemChange(idx, 'variantId', e.target.value)}
                            required
                            className="w-full rounded-md px-2 py-1.5 text-[#242423] bg-white border border-[#CFDBD5] text-xs focus:outline-none focus:border-[#242423]"
                          >
                            <option value="">Seleccione producto...</option>
                            {allVariants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.productName} {v.name !== 'Único' ? `(${v.name})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            step="any"
                            placeholder="Cant."
                            value={row.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            required
                            className="w-full rounded-md px-2 py-1.5 text-[#242423] bg-white border border-[#CFDBD5] text-xs text-center tabular-nums focus:outline-none focus:border-[#242423]"
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Costo"
                            value={row.costPrice}
                            onChange={(e) => handleItemChange(idx, 'costPrice', e.target.value)}
                            required
                            className="w-full rounded-md px-2 py-1.5 text-[#242423] bg-white border border-[#CFDBD5] text-xs text-right tabular-nums focus:outline-none focus:border-[#242423]"
                          />
                        </div>

                        <div className="col-span-2 text-right font-mono font-semibold text-[#242423] text-xs tabular-nums">
                          Bs {rowSubtotal.toFixed(2)}
                        </div>

                        <div className="col-span-1 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-[#5A5D5A] hover:text-[#BC4749] p-1 cursor-pointer"
                              title="Eliminar fila"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-end items-center gap-3 mt-3 pt-3 border-t border-[#CFDBD5]">
                  <span className="text-[#5A5D5A] text-xs">Costo Total Estimado:</span>
                  <span className="font-mono text-base font-bold text-[#242423] tabular-nums">
                    Bs {orderTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                  Notas / Términos de entrega (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones para recepción, condiciones de pago..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-xs focus:outline-none focus:border-[#242423]"
                />
              </div>

              {error && <p className="text-[#BC4749] text-xs">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 bg-white hover:bg-[#E8EDDF] text-[#242423] font-medium py-2 rounded-md text-xs border border-[#CFDBD5] transition shadow-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createOrder.isPending}
                  className="flex-1 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-semibold py-2 rounded-md text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {createOrder.isPending ? 'Guardando orden...' : 'Emitir orden de compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Orden */}
      {detailModalOrder && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailModalOrder(null)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 animate-modal-backdrop"
        >
          <div className="bg-white border border-[#CFDBD5] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-[#242423] animate-modal-panel">
            <div className="flex justify-between items-center border-b border-[#CFDBD5] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#242423]">Orden {detailModalOrder.order_number}</h3>
                <p className="text-xs text-[#5A5D5A] mt-0.5">
                  Proveedor: {detailModalOrder.suppliers?.name ?? '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOrder(null)}
                className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded-lg hover:bg-[#E8EDDF] transition cursor-pointer"
                aria-label="Cerrar detalle"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="overflow-x-auto bg-white rounded-lg border border-[#CFDBD5]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#CFDBD5] text-[#5A5D5A] bg-[#F7F9F6] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CFDBD5]/40">
                    {detailModalOrder.purchase_order_items?.map((item) => (
                      <tr key={item.id} className="hover:bg-[#E8EDDF]/20 transition-colors">
                        <td className="py-2 px-3 text-[#242423] font-medium">
                          {item.product_variants?.products?.name ?? 'Producto'}
                          {item.product_variants?.name && item.product_variants.name !== 'Único' && (
                            <span className="text-[#5A5D5A] ml-1">({item.product_variants.name})</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums text-[#333533]">
                          {item.quantity} {item.product_variants?.unit ?? 'u'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#5A5D5A] tabular-nums">
                          Bs {Number(item.cost_price).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#242423] tabular-nums">
                          Bs {Number(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center py-2 border-t border-[#CFDBD5]">
                <span className="font-semibold text-[#5A5D5A]">Total de la orden:</span>
                <span className="font-mono text-base font-bold text-[#242423] tabular-nums">
                  Bs {Number(detailModalOrder.total_cost).toFixed(2)}
                </span>
              </div>

              {detailModalOrder.notes && (
                <div className="bg-[#E8EDDF]/30 p-3 rounded-lg border border-[#CFDBD5]">
                  <span className="text-[#5A5D5A] block mb-0.5 font-medium">Notas:</span>
                  <p className="text-[#242423]">{detailModalOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDetailModalOrder(null)}
                className="flex-1 bg-white hover:bg-[#E8EDDF] text-[#242423] font-medium py-2 rounded-md text-xs border border-[#CFDBD5] transition shadow-xs cursor-pointer"
              >
                Cerrar
              </button>

              {detailModalOrder.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleReceive(detailModalOrder)}
                  disabled={receiveOrder.isPending}
                  className="flex-1 bg-[#EFF5EE] hover:bg-[#BBD2B8]/40 border border-[#BBD2B8] text-[#588157] font-semibold py-2 rounded-md text-xs transition disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {receiveOrder.isPending ? 'Confirmando...' : 'Confirmar recepción'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PurchaseOrdersPage

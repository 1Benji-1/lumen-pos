import { useState, useMemo } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useSales, useRefundSale, useSendDigitalReceipt, useActiveCashRegisters } from './hooks/useSales'
import { useCurrentUserRole } from '../../shared/hooks/useCurrentUserRole'
import { PosNavTabs } from './components/PosNavTabs'
import { StickyTableWrapper } from '../../shared/components/StickyTableWrapper'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import { SALE_STATUS_MAP, type SaleDetailed, type SaleStatus } from '@lumen-pos/types'

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]',
  refunded: 'bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]',
  cancelled: 'bg-[#E5E5E5] text-[#5A5D5A] border border-[#CFDBD5]',
}

export function SalesHistoryPage() {
  const { storeId, loading } = useStoreId()
  const { hasPermission, role, loading: roleLoading } = useCurrentUserRole()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [cashierFilter, setCashierFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const { data: sales, isLoading } = useSales(
    storeId,
    statusFilter !== 'all' ? { status: statusFilter as SaleStatus } : undefined
  )
  const { data: activeRegisters } = useActiveCashRegisters(storeId)
  const refundSale = useRefundSale(storeId)
  const sendReceipt = useSendDigitalReceipt()

  // Selected sale for detail / refund
  const [selectedSale, setSelectedSale] = useState<SaleDetailed | null>(null)
  const [refundModalSale, setRefundModalSale] = useState<SaleDetailed | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [disburseRegisterId, setDisburseRegisterId] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Rol con potestad para anular o devolver ventas
  const canRefund =
    !roleLoading &&
    (hasPermission('pos:audit_cash') ||
      hasPermission('pos:manage' as any) ||
      role === 'owner' ||
      role === 'admin')

  // Lista única de cajeros presentes en las ventas consultadas
  const uniqueCashiers = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sales ?? []) {
      if (s.sold_by && s.users?.full_name) {
        map.set(s.sold_by, s.users.full_name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [sales])

  if (loading || isLoading) return <LoadingScreen message="Cargando historial de ventas..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>

  const filteredSales = (sales ?? []).filter((s) => {
    // Filtro por cajero
    if (cashierFilter !== 'all' && s.sold_by !== cashierFilter) return false

    // Búsqueda de texto
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const id = s.id.toLowerCase()
    const customer = s.customers?.full_name?.toLowerCase() ?? ''
    const user = s.users?.full_name?.toLowerCase() ?? ''
    const email = s.customer_email?.toLowerCase() ?? ''
    return id.includes(term) || customer.includes(term) || user.includes(term) || email.includes(term)
  })

  async function handleConfirmRefund(e: React.FormEvent) {
    e.preventDefault()
    if (!refundModalSale) return

    try {
      await refundSale.mutateAsync({
        saleId: refundModalSale.id,
        reason: refundReason.trim() || undefined,
        disburseCashRegisterId: disburseRegisterId || undefined,
      })
      setRefundModalSale(null)
      setRefundReason('')
      setDisburseRegisterId('')
      if (selectedSale?.id === refundModalSale.id) {
        setSelectedSale(null)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al anular la venta')
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSale || !emailInput.trim()) return

    try {
      await sendReceipt.mutateAsync({
        toEmail: emailInput.trim(),
        saleId: selectedSale.id,
        lines: selectedSale.sale_items?.map((it) => ({
          productName: it.product_variants?.products?.name || 'Producto',
          variantName: it.product_variants?.name || 'Único',
          quantity: it.quantity,
          unitPrice: it.unit_price,
          discount: it.discount,
        })) || [],
        total: Number(selectedSale.total),
        subtotal: Number(selectedSale.subtotal),
        discount: Number(selectedSale.discount),
        paymentMethod: selectedSale.payment_method,
      })
      setEmailSent(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al enviar comprobante')
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-inventory-view">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">
            Historial de Ventas y Comprobantes
          </h1>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Consulta de tickets emitidos, trazabilidad por cajero y devoluciones autorizadas con reversión de existencias.
          </p>
        </div>
      </div>

      {/* Subnavegación de Punto de Venta */}
      <PosNavTabs />

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Buscar por ID de ticket, cliente, correo o cajero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#CFDBD5] rounded-md px-3.5 py-2 text-xs text-[#242423] placeholder-[#5A5D5A] focus:outline-none focus:border-[#242423] shadow-xs"
          />
        </div>

        {/* Filtro por Cajero */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#5A5D5A] font-medium">Cajero:</label>
          <select
            value={cashierFilter}
            onChange={(e) => setCashierFilter(e.target.value)}
            className="bg-white border border-[#CFDBD5] rounded-md px-3 py-2 text-xs text-[#242423] focus:outline-none focus:border-[#242423] shadow-xs"
          >
            <option value="all">Todos los cajeros</option>
            {uniqueCashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Estado */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#5A5D5A] font-medium">Estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#CFDBD5] rounded-md px-3 py-2 text-xs text-[#242423] focus:outline-none focus:border-[#242423] shadow-xs"
          >
            <option value="all">Todas las ventas</option>
            <option value="completed">Completadas</option>
            <option value="refunded">Anuladas / Reembolsadas</option>
          </select>
        </div>
      </div>

      {/* Tabla de ventas con Trazabilidad Completa */}
      {isLoading ? (
        <p className="text-[#5A5D5A] py-4 text-xs">Cargando historial de ventas...</p>
      ) : filteredSales.length === 0 ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center shadow-xs">
          <p className="text-[#5A5D5A] text-sm">No se encontraron ventas registradas con los filtros actuales.</p>
        </div>
      ) : (
        <StickyTableWrapper>
          <table className="w-full text-left text-sm">
            <thead className="table-sticky-header text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-3">Fecha y hora</th>
                <th scope="col" className="py-3 px-3">Ticket</th>
                <th scope="col" className="py-3 px-3">Cajero</th>
                <th scope="col" className="py-3 px-3">Caja / Turno</th>
                <th scope="col" className="py-3 px-3">Cliente</th>
                <th scope="col" className="py-3 px-3">Método de pago</th>
                <th scope="col" className="py-3 px-3 text-right">Total (Bs)</th>
                <th scope="col" className="py-3 px-3 text-center">Estado</th>
                <th scope="col" className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBD5]/40 text-xs">
              {filteredSales.map((sale) => {
                const date = new Date(sale.created_at)
                const statusInfo = SALE_STATUS_MAP[sale.status] ?? {
                  label: sale.status,
                }
                const badgeStyle = STATUS_STYLES[sale.status] || 'bg-[#E5E5E5] text-[#5A5D5A] border border-[#CFDBD5]'
                const isRegisterOpen = sale.cash_registers?.status === 'open'

                return (
                  <tr key={sale.id} className="hover:bg-[#E5E5E5]/40 transition">
                    {/* Fecha */}
                    <td className="py-3 px-3 text-[#5A5D5A] font-mono whitespace-nowrap">
                      {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}{' '}
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Ticket */}
                    <td className="py-3 px-3 font-mono font-bold text-[#242423]">
                      #{sale.id.slice(0, 8)}
                    </td>

                    {/* Cajero */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#E8EDDF] border border-[#CFDBD5] flex items-center justify-center text-[10px] font-bold text-[#242423]">
                          {(sale.users?.full_name || 'C').charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-[#242423]">
                          {sale.users?.full_name || 'Cajero'}
                        </span>
                      </div>
                    </td>

                    {/* Caja / Turno */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {isRegisterOpen ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#588157] animate-pulse" />
                          <span>Caja activa</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8EDDF] text-[#5A5D5A] border border-[#CFDBD5]">
                          Turno cerrado
                        </span>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-3">
                      <span className="font-medium text-[#242423] block">
                        {sale.customers?.full_name || 'Consumidor final'}
                      </span>
                      {sale.customer_email && (
                        <span className="text-[11px] text-[#5A5D5A] block">{sale.customer_email}</span>
                      )}
                    </td>

                    {/* Método de pago */}
                    <td className="py-3 px-3 capitalize text-[#5A5D5A] whitespace-nowrap">
                      {sale.payment_method === 'split' ? (
                        <span className="text-[#8A6D14] font-medium">Pago dividido</span>
                      ) : sale.payment_method === 'qr' ? (
                        'Pago QR'
                      ) : sale.payment_method === 'transfer' ? (
                        'Transferencia'
                      ) : sale.payment_method === 'card' ? (
                        'Tarjeta'
                      ) : (
                        'Efectivo'
                      )}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#242423] tabular-nums whitespace-nowrap">
                      Bs {Number(sale.total).toFixed(2)}
                      {Number(sale.discount) > 0 && (
                        <span className="text-[11px] text-[#588157] block font-normal">
                          -Bs {Number(sale.discount).toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStyle}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSale(sale)
                          setEmailInput(sale.customer_email || sale.customers?.email || '')
                          setEmailSent(false)
                        }}
                        className="text-[#242423] hover:underline font-semibold text-xs transition min-h-[36px] inline-flex items-center"
                      >
                        Ver detalle
                      </button>

                      {sale.status === 'completed' && (
                        canRefund ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundModalSale(sale)
                              setRefundReason('')
                              setDisburseRegisterId(activeRegisters?.[0]?.id || '')
                            }}
                            className="text-[#BC4749] hover:underline font-semibold text-xs transition min-h-[36px] inline-flex items-center"
                            title="Anular venta y reingresar productos al stock"
                          >
                            Devolver
                          </button>
                        ) : (
                          <span
                            className="text-[#CFDBD5] text-xs cursor-help inline-flex items-center gap-1"
                            title="Solo un supervisor o administrador puede autorizar devoluciones"
                          >
                            <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#CFDBD5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}

      {/* Modal Detalle de Venta y Recibo Digital */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/60">
          <div className="bg-white border border-[#CFDBD5] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 text-[#242423] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#CFDBD5] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#242423]">Venta #{selectedSale.id.slice(0, 8)}</h3>
                <p className="text-xs text-[#5A5D5A] mt-0.5">
                  {new Date(selectedSale.created_at).toLocaleString()} • Cajero: <strong className="text-[#242423]">{selectedSale.users?.full_name || '—'}</strong>
                </p>
                <div className="text-[11px] text-[#5A5D5A] mt-1 flex items-center gap-2">
                  <span>Caja de origen:</span>
                  {selectedSale.cash_registers?.status === 'open' ? (
                    <span className="font-semibold text-[#588157]">Activa en mostrador</span>
                  ) : (
                    <span className="font-medium text-[#5A5D5A]">Turno cerrado</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="text-[#5A5D5A] hover:text-[#242423] p-1.5 rounded-md hover:bg-[#E5E5E5] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Aviso si la venta fue anulada */}
            {selectedSale.status === 'refunded' && (
              <div className="p-3.5 rounded-xl bg-[#FDF0ED] border border-[#F0B2B4] space-y-1 text-xs">
                <div className="flex items-center justify-between text-[#BC4749] font-bold">
                  <span>Comprobante Anulado / Reembolsado</span>
                  <span className="font-mono text-[11px] text-[#5A5D5A]">
                    {selectedSale.refunded_at ? new Date(selectedSale.refunded_at).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-[#242423]">
                  <strong>Autorizado por:</strong> {selectedSale.refunded_by_user?.full_name || 'Supervisión'}
                </p>
                {selectedSale.refund_reason && (
                  <p className="text-[#5A5D5A]">
                    <strong>Motivo registrado:</strong> {selectedSale.refund_reason}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="overflow-x-auto bg-[#E8EDDF]/40 rounded-xl border border-[#CFDBD5]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#CFDBD5] text-[#5A5D5A] bg-[#E8EDDF]/80">
                    <tr>
                      <th scope="col" className="py-2 px-3 font-semibold">Producto</th>
                      <th scope="col" className="py-2 px-3 text-center font-semibold">Cant.</th>
                      <th scope="col" className="py-2 px-3 text-right font-semibold">P. Unit</th>
                      <th scope="col" className="py-2 px-3 text-right font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CFDBD5]/40">
                    {selectedSale.sale_items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 text-[#242423]">
                          <span className="font-medium block">
                            {item.product_variants?.products?.name || 'Producto'}
                          </span>
                          {item.product_variants?.name && item.product_variants.name !== 'Único' && (
                            <span className="text-xs text-[#5A5D5A] block">{item.product_variants.name}</span>
                          )}
                          {Number(item.discount) > 0 && (
                            <span className="text-xs text-[#588157] block">
                              Desc: -Bs {Number(item.discount).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[#5A5D5A]">
                          {item.quantity} {item.product_variants?.unit || 'u'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#5A5D5A]">
                          Bs {Number(item.unit_price).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#242423]">
                          Bs {Number(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="bg-[#E8EDDF]/40 p-3.5 rounded-xl border border-[#CFDBD5] space-y-1">
                <div className="flex justify-between text-[#5A5D5A]">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#242423]">Bs {Number(selectedSale.subtotal).toFixed(2)}</span>
                </div>
                {Number(selectedSale.discount) > 0 && (
                  <div className="flex justify-between text-[#588157]">
                    <span>Descuento</span>
                    <span className="font-mono">-Bs {Number(selectedSale.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#242423] text-sm pt-1 border-t border-[#CFDBD5]">
                  <span>Total</span>
                  <span className="font-mono text-[#588157]">Bs {Number(selectedSale.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Pagos */}
              {selectedSale.sale_payments && selectedSale.sale_payments.length > 0 && (
                <div className="bg-[#E8EDDF]/40 p-3 rounded-xl border border-[#CFDBD5]">
                  <span className="text-xs font-semibold text-[#5A5D5A] block mb-1">
                    Desglose de pagos:
                  </span>
                  {selectedSale.sale_payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs text-[#242423]">
                      <span className="capitalize">{p.payment_method}:</span>
                      <span className="font-mono">Bs {Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Envío de recibo digital */}
              <div className="bg-[#E5E5E5]/50 p-3.5 rounded-xl border border-[#CFDBD5] space-y-2">
                <span className="font-semibold text-[#242423] block text-xs">Enviar recibo digital por correo</span>
                {emailSent ? (
                  <div className="text-[#588157] text-xs font-medium">✓ Recibo enviado a {emailInput}</div>
                ) : (
                  <form onSubmit={handleSendEmail} className="flex gap-2">
                    <input
                      type="email"
                      placeholder="correo@cliente.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                      className="flex-1 rounded-md border border-[#CFDBD5] px-3 py-1.5 text-[#242423] bg-white text-xs focus:outline-none focus:border-[#242423] shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={sendReceipt.isPending}
                      className="bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-semibold px-3 py-1.5 rounded-md text-xs transition disabled:opacity-50 shadow-xs min-h-[36px]"
                    >
                      {sendReceipt.isPending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="flex-1 bg-[#E5E5E5] hover:bg-[#D5D5D5] text-[#242423] font-medium py-2 rounded-md text-xs transition min-h-[44px]"
              >
                Cerrar
              </button>

              {selectedSale.status === 'completed' && canRefund && (
                <button
                  type="button"
                  onClick={() => {
                    setRefundModalSale(selectedSale)
                    setRefundReason('')
                    setDisburseRegisterId(activeRegisters?.[0]?.id || '')
                  }}
                  className="bg-[#FDF0ED] hover:bg-[#F5D5D0] text-[#BC4749] border border-[#F0B2B4] font-medium px-4 py-2 rounded-md text-xs transition min-h-[44px]"
                >
                  Anular / Devolver venta
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Devolución Inteligente */}
      {refundModalSale && (() => {
        // Cálculo del monto en efectivo
        const cashPayments = refundModalSale.sale_payments?.filter((p) => p.payment_method === 'cash') ?? []
        const cashAmount =
          cashPayments.length > 0
            ? cashPayments.reduce((acc, p) => acc + Number(p.amount), 0)
            : refundModalSale.payment_method === 'cash'
            ? Number(refundModalSale.total)
            : 0

        const hasCash = cashAmount > 0
        const isOriginalRegisterClosed = refundModalSale.cash_registers?.status !== 'open'

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/60">
            <div className="bg-white border border-[#CFDBD5] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 text-[#242423] max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#CFDBD5] pb-3">
                <div>
                  <h3 className="font-bold text-base text-[#BC4749]">Autorización de Devolución</h3>
                  <p className="text-xs text-[#5A5D5A] mt-0.5">
                    Ticket #{refundModalSale.id.slice(0, 8)} • Cajero original: <strong>{refundModalSale.users?.full_name || 'Cajero'}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRefundModalSale(null)}
                  className="text-[#5A5D5A] hover:text-[#242423] p-1.5 rounded-md hover:bg-[#E5E5E5] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Cerrar modal"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmRefund} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-[#E8EDDF]/40 border border-[#CFDBD5] space-y-1">
                  <div className="flex justify-between text-[#5A5D5A]">
                    <span>Total del ticket a reembolsar:</span>
                    <strong className="text-[#242423] font-mono text-sm">
                      Bs {Number(refundModalSale.total).toFixed(2)}
                    </strong>
                  </div>
                  {hasCash && (
                    <div className="flex justify-between text-[#BC4749]">
                      <span>Efectivo físico a devolver:</span>
                      <strong className="font-mono text-sm">
                        Bs {cashAmount.toFixed(2)}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="bg-[#FDF0ED] p-3 rounded-xl border border-[#F0B2B4] text-[#BC4749] space-y-1 text-xs">
                  <p>• Los artículos vendidos reingresarán automáticamente al stock disponible.</p>
                  <p>• Se registrará una auditoría con tu usuario como responsable de la anulación.</p>
                </div>

                {/* Si hubo pago en efectivo: determinar la caja de desembolso */}
                {hasCash && (
                  isOriginalRegisterClosed ? (
                    <div className="space-y-2 p-3.5 rounded-xl bg-[#FEF9E7] border border-[#F5CB5C]/70">
                      <div className="flex items-center gap-2 text-[#8A6D14] font-bold">
                        <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>La caja original de esta venta ya está CERRADA</span>
                      </div>
                      <p className="text-[11px] text-[#5A5D5A] leading-relaxed">
                        Para no descuadrar el arqueo físico de hoy, indica de qué gaveta activa saldrán los <strong>Bs {cashAmount.toFixed(2)}</strong> en billetes:
                      </p>

                      {activeRegisters && activeRegisters.length > 0 ? (
                        <div>
                          <label className="block font-semibold text-[#242423] mb-1">
                            Caja activa que entrega el dinero:
                          </label>
                          <select
                            value={disburseRegisterId}
                            onChange={(e) => setDisburseRegisterId(e.target.value)}
                            className="w-full bg-white border border-[#CFDBD5] rounded-md px-3 py-2 text-xs font-semibold text-[#242423] focus:outline-none focus:border-[#242423]"
                            required
                          >
                            <option value="">Selecciona una caja activa...</option>
                            {activeRegisters.map((reg) => (
                              <option key={reg.id} value={reg.id}>
                                Caja de {reg.users?.full_name || 'Cajero'} (Apertura: Bs {Number(reg.opening_amount).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white rounded-lg border border-[#F0B2B4] text-[#BC4749] text-[11px]">
                          <strong>No hay cajas registradoras abiertas en este momento.</strong> El egreso quedará registrado contablemente en la auditoría general.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#EFF5EE] border border-[#BBD2B8] text-[11px] text-[#588157] space-y-0.5">
                      <p className="font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#588157]" />
                        Caja original aún abierta en mostrador
                      </p>
                      <p className="text-[#333533]">
                        El retiro de Bs {cashAmount.toFixed(2)} se descontará automáticamente de la gaveta de <strong>{refundModalSale.users?.full_name || 'Cajero'}</strong> para que su arqueo de turno cuadre al cierre.
                      </p>
                    </div>
                  )
                )}

                <div>
                  <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                    Motivo de la anulación o devolución *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Ej. Producto defectuoso, error en cobro, cambio por otro artículo..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full rounded-md border border-[#CFDBD5] px-3 py-2 text-[#242423] bg-white text-xs focus:outline-none focus:border-[#242423] shadow-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRefundModalSale(null)}
                    className="flex-1 bg-[#E5E5E5] hover:bg-[#D5D5D5] text-[#242423] font-medium py-2 rounded-md text-xs transition min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={refundSale.isPending}
                    className="flex-1 bg-[#BC4749] hover:bg-[#9E3B3D] text-white font-bold py-2 rounded-md text-xs transition disabled:opacity-50 shadow-xs min-h-[44px]"
                  >
                    {refundSale.isPending ? 'Procesando devolución...' : 'Confirmar anulación'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default SalesHistoryPage

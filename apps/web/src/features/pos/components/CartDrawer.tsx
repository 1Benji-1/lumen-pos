import { useState } from 'react'
import type { CartLine } from '../hooks/useCart'
import { useCustomers } from '../../../modules/customers'
import { useRetailSubrubro } from '../../../shared/hooks/useRetailSubrubro'
import { useStoreSettings } from '../../settings/hooks/useStoreSettings'
import { QuickCustomerModal } from './QuickCustomerModal'
import { CustomerSearchModal } from './CustomerSearchModal'
import { usePosToast } from '../context/PosToastContext'

interface CartDrawerProps {
  storeId: string
  lines: CartLine[]
  itemsSubtotal: number
  globalDiscount: number
  setGlobalDiscount: (d: number) => void
  total: number
  onUpdateQuantity: (variantId: string, quantity: number) => void
  onUpdateLineDiscount: (variantId: string, discount: number) => void
  onRemoveItem: (variantId: string) => void
  onClearCart?: () => void
  selectedCustomerId: string
  onSelectCustomer: (id: string, name?: string, email?: string) => void
  selectedCustomerEmail: string
  onUpdateCustomerEmail: (email: string) => void
  onOpenCheckout: () => void
}

export function CartDrawer({
  storeId,
  lines,
  itemsSubtotal,
  globalDiscount,
  setGlobalDiscount,
  total,
  onUpdateQuantity,
  onUpdateLineDiscount,
  onRemoveItem,
  onClearCart,
  selectedCustomerId,
  onSelectCustomer,
  selectedCustomerEmail: _selectedCustomerEmail,
  onUpdateCustomerEmail: _onUpdateCustomerEmail,
  onOpenCheckout,
}: CartDrawerProps) {
  const { config } = useRetailSubrubro()
  const { settings } = useStoreSettings(storeId)
  const currency = settings?.currency_symbol || 'Bs'
  const { toast } = usePosToast()

  const [activeDiscountLineId, setActiveDiscountLineId] = useState<string | null>(null)
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false)
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showGlobalDiscount, setShowGlobalDiscount] = useState(false)

  const { data: customers } = useCustomers(storeId, { status: 'active' })
  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId)

  function handleQuickCustomerCreated(customer: { id: string; full_name: string; email?: string | null }) {
    onSelectCustomer(customer.id, customer.full_name, customer.email || undefined)
  }

  function handleProceedToCheckout() {
    if (lines.length === 0) return

    if (settings?.require_customer_for_sale && !selectedCustomerId) {
      toast.warning('Esta tienda requiere registrar o seleccionar un cliente antes de procesar la venta.')
      return
    }

    onOpenCheckout()
  }

  // Stepper táctil: incremento con validación de stock
  function handleIncrement(line: CartLine) {
    const nextQty = line.quantity + 1
    if (settings?.allow_negative_stock === false && nextQty > line.stockAvailable) {
      toast.warning(`Stock insuficiente. Solo hay ${line.stockAvailable} ${line.unit || 'u'} disponibles.`)
      return
    }
    onUpdateQuantity(line.variantId, nextQty)
  }

  // Stepper táctil: decremento
  function handleDecrement(line: CartLine) {
    const minQty = config.allowDecimals ? 0.001 : 1
    if (line.quantity <= minQty) return
    onUpdateQuantity(line.variantId, Math.max(minQty, line.quantity - 1))
  }

  // Entrada manual de cantidad con validación
  function handleManualQuantity(line: CartLine, val: number) {
    if (isNaN(val) || val < 0) return
    if (settings?.allow_negative_stock === false && val > line.stockAvailable) {
      toast.warning(`Stock insuficiente. Solo hay ${line.stockAvailable} ${line.unit || 'u'} disponibles.`)
      onUpdateQuantity(line.variantId, line.stockAvailable)
      return
    }
    onUpdateQuantity(line.variantId, val)
  }

  return (
    <div className="bg-white text-[#242423] p-3 w-full max-w-sm flex flex-col h-full border-l border-[#CFDBD5] shadow-xs">
      {/* Cabecera del Carrito Compacta */}
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#CFDBD5] shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-[#F5CB5C]/20 text-[#8A6D14]">
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-tight text-[#242423] leading-tight">Carrito de venta</h2>
            <span className="text-[11px] text-[#5A5D5A]">
              {lines.length} ítem{lines.length !== 1 ? 's' : ''} en mostrador
            </span>
          </div>
        </div>

        {lines.length > 0 && onClearCart && (
          confirmClear ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#BC4749] font-bold">¿Vaciar?</span>
              <button
                type="button"
                onClick={() => {
                  onClearCart()
                  setConfirmClear(false)
                  toast.info('Se vació el carrito.')
                }}
                aria-label="Confirmar vaciado de la cesta"
                className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#BC4749] hover:bg-[#a83b3d] text-white transition shadow-2xs"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                aria-label="Cancelar vaciado"
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E5E5E5] hover:bg-[#CFDBD5] text-[#242423] transition"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              aria-label="Vaciar cesta de productos"
              className="text-[11px] text-[#5A5D5A] hover:text-[#BC4749] transition font-medium"
            >
              Vaciar cesta
            </button>
          )
        )}
      </div>

      {/* Lista de Productos en Mostrador (Área Principal Optimizada y Scrolleable) */}
      {lines.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#5A5D5A]">
          <div className="w-12 h-12 mb-2.5 rounded-2xl bg-[#E8EDDF] border border-[#CFDBD5] flex items-center justify-center text-[#5A5D5A]">
            <svg aria-hidden="true" className="w-6 h-6 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-xs font-semibold text-[#242423] mb-1">Cesta vacía</p>
          <p className="text-[11px] text-[#5A5D5A] max-w-[200px] leading-relaxed">
            Escanee con el lector o seleccione artículos del catálogo para registrar la venta.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs scrollbar-thin">
          {lines.map((line) => {
            const lineSubtotal = Math.max(
              0,
              line.unitPrice * line.quantity - (line.discount || 0)
            )

            return (
              <div
                key={line.variantId}
                className="bg-[#E8EDDF]/25 p-2 rounded-lg border border-[#CFDBD5] hover:border-[#CFDBD5]/90 transition shadow-2xs"
              >
                {/* Fila 1: Nombre de producto, total de línea y eliminar */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-[#242423] truncate block leading-snug">
                      {line.productName}
                      {line.variantName !== 'Único' && (
                        <span className="text-[#5A5D5A] font-normal text-[11px] ml-1">
                          ({line.variantName})
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right">
                      <span className="font-bold text-[#242423] font-mono text-xs block leading-tight">
                        {currency} {lineSubtotal.toFixed(2)}
                      </span>
                      {Number(line.discount) > 0 && (
                        <span className="text-[10px] text-[#588157] font-mono font-medium block leading-none">
                          -{currency} {Number(line.discount).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(line.variantId)}
                      className="w-5 h-5 text-[#5A5D5A] hover:text-[#BC4749] hover:bg-[#FDF0ED] rounded flex items-center justify-center text-xs transition shrink-0"
                      title="Eliminar ítem del carrito"
                      aria-label={`Eliminar ${line.productName} del carrito`}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Fila 2: Stepper de cantidad, precio unitario y botón de descuento */}
                <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-[#CFDBD5]/40">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDecrement(line)}
                      disabled={line.quantity <= (config.allowDecimals ? 0.001 : 1)}
                      aria-label={`Disminuir cantidad de ${line.productName}`}
                      className="w-7 h-7 rounded bg-white border border-[#CFDBD5] text-[#242423] hover:bg-[#E5E5E5] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm transition shadow-2xs select-none"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={config.allowDecimals ? 0.001 : (line.unit === 'unit' ? 1 : 0.001)}
                      step={config.allowDecimals ? 'any' : (line.unit === 'unit' ? 1 : 0.001)}
                      value={line.quantity}
                      aria-label={`Cantidad para ${line.productName}`}
                      onChange={(e) => handleManualQuantity(line, Number(e.target.value))}
                      className="w-11 h-7 rounded px-0.5 text-[#242423] text-center font-mono font-bold text-xs bg-white border border-[#CFDBD5] focus:outline-none focus:border-[#242423] shadow-2xs"
                    />

                    <button
                      type="button"
                      onClick={() => handleIncrement(line)}
                      aria-label={`Aumentar cantidad de ${line.productName}`}
                      className="w-7 h-7 rounded bg-white border border-[#CFDBD5] text-[#242423] hover:bg-[#E5E5E5] active:scale-95 flex items-center justify-center font-bold text-sm transition shadow-2xs select-none"
                    >
                      +
                    </button>

                    <span className="text-[11px] text-[#5A5D5A] ml-0.5">{line.unit || 'u'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#5A5D5A]">
                    <span className="font-mono">
                      {currency} {line.unitPrice.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDiscountLineId(
                          activeDiscountLineId === line.variantId ? null : line.variantId
                        )
                      }
                      aria-label={`Editar descuento para ${line.productName}`}
                      className={`px-1.5 py-0.5 rounded text-[11px] border transition ${
                        Number(line.discount) > 0
                          ? 'border-[#BBD2B8] bg-[#EFF5EE] text-[#588157] font-semibold'
                          : 'border-[#CFDBD5] bg-white text-[#5A5D5A] hover:text-[#242423]'
                      }`}
                    >
                      {Number(line.discount) > 0 ? `-${currency}${line.discount}` : '+ Desc'}
                    </button>
                  </div>
                </div>

                {/* Edición de descuento por línea (desplegable) */}
                {activeDiscountLineId === line.variantId && (
                  <div className="bg-white mt-1.5 p-1.5 rounded border border-[#CFDBD5] flex items-center justify-between gap-1 shadow-2xs">
                    <span className="text-[11px] text-[#5A5D5A]">Descuento línea ({currency}):</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      max={line.unitPrice * line.quantity}
                      value={line.discount || ''}
                      placeholder="0.00"
                      autoFocus
                      aria-label={`Monto de descuento para ${line.productName}`}
                      onChange={(e) =>
                        onUpdateLineDiscount(line.variantId, Number(e.target.value) || 0)
                      }
                      className="w-16 rounded border border-[#CFDBD5] px-1 py-0.5 text-[#242423] text-xs font-mono bg-white text-right focus:outline-none focus:border-[#242423]"
                    />
                  </div>
                )}

                {/* Alerta compacta si la cantidad supera las existencias */}
                {line.quantity > line.stockAvailable && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] text-[10px]">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="truncate">
                      {line.stockAvailable <= 0
                        ? `Sin stock (${line.stockAvailable - line.quantity} ${line.unit || 'u'})`
                        : `Stock: ${line.stockAvailable} (quedará en ${line.stockAvailable - line.quantity} ${line.unit || 'u'})`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Resumen Fijo y Botón de Cobro Compacto */}
      <div className="border-t border-[#CFDBD5] mt-2 pt-2 space-y-2 shrink-0">
        {/* Selector de Cliente en barra compacta tipo chip */}
        <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 bg-[#E8EDDF]/40 rounded-lg border border-[#CFDBD5] text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setIsCustomerSearchOpen(true)}
            className="flex items-center gap-1.5 min-w-0 flex-1 text-left group"
            title="Buscar o asignar cliente"
          >
            <div className="w-5 h-5 rounded bg-white border border-[#CFDBD5] flex items-center justify-center shrink-0 text-[#5A5D5A] group-hover:text-[#242423]">
              <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-xs font-semibold text-[#242423] truncate">
                {selectedCustomer ? selectedCustomer.full_name : 'Consumidor final'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {selectedCustomerId && (
              <button
                type="button"
                onClick={() => onSelectCustomer('', 'Consumidor final', undefined)}
                title="Quitar cliente (volver a Consumidor final)"
                aria-label="Quitar cliente asignado"
                className="w-5 h-5 flex items-center justify-center text-[10px] text-[#5A5D5A] hover:text-[#BC4749] hover:bg-white rounded transition"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCustomerSearchOpen(true)}
              aria-label="Buscar cliente"
              className="px-2 py-0.5 rounded bg-white hover:bg-[#E5E5E5] text-[#242423] border border-[#CFDBD5] text-[11px] font-medium transition shadow-2xs active:scale-[0.98]"
            >
              {selectedCustomerId ? 'Cambiar' : 'Buscar'}
            </button>
            <button
              type="button"
              onClick={() => setIsQuickCustomerOpen(true)}
              aria-label="Registrar nuevo cliente"
              className="px-1.5 py-0.5 rounded bg-[#F5CB5C]/40 hover:bg-[#F5CB5C]/70 text-[#242423] border border-[#F5CB5C]/60 text-[11px] font-bold transition shadow-2xs active:scale-[0.98]"
              title="Registrar nuevo cliente"
            >
              +
            </button>
          </div>
        </div>

        {/* Fila compacta de Subtotal y Descuento global */}
        <div className="flex items-center justify-between text-xs text-[#5A5D5A] px-1">
          <div className="flex items-center gap-1.5">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold text-[#242423]">{currency} {itemsSubtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1">
            {showGlobalDiscount || globalDiscount > 0 ? (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#588157]">Desc: -{currency}</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  max={itemsSubtotal}
                  placeholder="0.00"
                  aria-label="Descuento global a la venta"
                  value={globalDiscount || ''}
                  onChange={(e) => setGlobalDiscount(Number(e.target.value) || 0)}
                  className="w-14 rounded border border-[#CFDBD5] px-1 py-0.5 text-[#242423] text-xs text-right font-mono bg-white focus:outline-none focus:border-[#242423]"
                />
                {globalDiscount === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowGlobalDiscount(false)}
                    className="text-[#5A5D5A] hover:text-[#BC4749] text-xs px-0.5"
                    title="Cerrar descuento"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowGlobalDiscount(true)}
                className="text-[11px] text-[#5A5D5A] hover:text-[#242423] hover:underline"
              >
                + Descuento
              </button>
            )}
          </div>
        </div>

        {/* Botón Principal Prominente para Cobrar (con Total integrado y atajo F2) */}
        <button
          type="button"
          disabled={lines.length === 0}
          onClick={handleProceedToCheckout}
          aria-label="Ir a cobrar venta"
          className="w-full bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-bold rounded-xl py-2.5 px-3.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-between text-sm active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Cobrar</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-extrabold">{currency} {total.toFixed(2)}</span>
            <span className="text-xs bg-[#242423]/10 text-[#242423] px-1.5 py-0.5 rounded font-bold font-mono">F2</span>
          </div>
        </button>
      </div>

      {/* Modal de Búsqueda Flotante de Cliente */}
      <CustomerSearchModal
        isOpen={isCustomerSearchOpen}
        onClose={() => setIsCustomerSearchOpen(false)}
        storeId={storeId}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={onSelectCustomer}
        onOpenCreateCustomer={() => setIsQuickCustomerOpen(true)}
      />

      {/* Modal Rápido de Nuevo Cliente */}
      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        storeId={storeId}
        onCustomerCreated={handleQuickCustomerCreated}
      />
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import type { CartLine } from '../hooks/useCart'
import type { PaymentMethod, PaymentSplitItem } from '@lumen-pos/types'
import { PAYMENT_METHODS } from '@lumen-pos/types'
import { useRetailSubrubro } from '../../../shared/hooks/useRetailSubrubro'
import { useStoreSettings } from '../../settings/hooks/useStoreSettings'
import { useStorePlan } from '../../../shared/hooks/useStorePlan'
import { usePosToast } from '../context/PosToastContext'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  lines: CartLine[]
  itemsSubtotal: number
  globalDiscount: number
  total: number
  customerId: string | null
  customerName?: string
  initialCustomerEmail?: string
  onConfirmSale: (params: {
    paymentMethod: PaymentMethod
    customerId: string | null
    discount: number
    payments?: PaymentSplitItem[]
    customerEmail?: string | null
  }) => void
  isSaving: boolean
}

export function CheckoutModal({
  isOpen,
  onClose,
  storeId,
  lines,
  globalDiscount,
  total,
  customerId,
  customerName = 'Consumidor final',
  initialCustomerEmail = '',
  onConfirmSale,
  isSaving,
}: CheckoutModalProps) {
  const { config } = useRetailSubrubro()
  const { settings } = useStoreSettings(storeId)
  const { data: storePlan } = useStorePlan(storeId)
  const planFeatures = ((storePlan?.plans as any)?.features as Record<string, boolean> | undefined) || {}
  const overrides = (storePlan?.feature_overrides as Record<string, boolean> | null) || {}
  const effectiveFeatures = { ...planFeatures, ...overrides }
  const allowSplitPayment = effectiveFeatures['split_payments'] === true

  const currency = settings?.currency_symbol || 'Bs'

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState<number | ''>('')
  const [customerEmail, setCustomerEmail] = useState<string>(initialCustomerEmail)
  const [splitPayments, setSplitPayments] = useState<PaymentSplitItem[]>([
    { payment_method: 'cash', amount: Number((total / 2).toFixed(2)) },
    { payment_method: 'card', amount: Number((total - total / 2).toFixed(2)) },
  ])

  const cashInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar email inicial al abrir
  useEffect(() => {
    if (isOpen) {
      setCustomerEmail(initialCustomerEmail || '')
      setCashReceived('')
      // Enfocar input de efectivo por defecto tras abrir
      setTimeout(() => {
        cashInputRef.current?.focus()
      }, 80)
    }
  }, [isOpen, initialCustomerEmail])

  // Split payment helpers
  const splitTotal = splitPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const splitDifference = Math.round((total - splitTotal) * 100) / 100

  function handleSplitMethodChange(idx: number, method: 'cash' | 'card' | 'qr' | 'transfer') {
    setSplitPayments((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, payment_method: method } : p))
    )
  }

  function handleSplitAmountChange(idx: number, amountStr: string) {
    const val = Number(amountStr) || 0
    setSplitPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, amount: val } : p)))
  }

  function handleAddSplitRow() {
    setSplitPayments((prev) => [...prev, { payment_method: 'card', amount: 0 }])
  }

  function handleRemoveSplitRow(idx: number) {
    setSplitPayments((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleAutoFillRemaining(idx: number) {
    const otherSum = splitPayments
      .filter((_, i) => i !== idx)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const remaining = Math.max(0, Math.round((total - otherSum) * 100) / 100)
    setSplitPayments((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, amount: remaining } : p))
    )
  }

  const { toast } = usePosToast()

  function handleSubmitSale() {
    if (paymentMethod === 'split' && !allowSplitPayment) {
      toast.warning('Los pagos divididos (Split) están disponibles a partir del Plan Pro.')
      return
    }

    if (settings?.require_customer_for_sale && !customerId) {
      toast.warning('Esta tienda requiere registrar o seleccionar un cliente antes de procesar la venta.')
      return
    }

    if (paymentMethod === 'split') {
      if (Math.abs(splitDifference) > 0.05) {
        toast.warning(
          `La suma de pagos divididos (${currency} ${splitTotal.toFixed(2)}) no coincide con el total de la venta (${currency} ${total.toFixed(2)}).`
        )
        return
      }
    }

    onConfirmSale({
      paymentMethod,
      customerId: customerId || null,
      discount: globalDiscount,
      payments: paymentMethod === 'split' ? splitPayments : undefined,
      customerEmail: customerEmail.trim() || null,
    })
  }

  const handleSubmitSaleRef = useRef(handleSubmitSale)
  handleSubmitSaleRef.current = handleSubmitSale

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Manejo de atajos de teclado eficiente (Escape = cerrar, Enter = confirmar) sin lag en inputs
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'BUTTON' && !isSaving) {
          e.preventDefault()
          handleSubmitSaleRef.current()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving])

  if (!isOpen) return null

  const cashChange = typeof cashReceived === 'number' ? cashReceived - total : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/60">
      <div className="bg-white border border-[#CFDBD5] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#242423] animate-modal-panel">
        {/* Cabecera Principal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#CFDBD5] bg-[#E8EDDF]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#F5CB5C]/20 text-[#8A6D14]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#242423] tracking-tight">Cobrar venta</h2>
              <p className="text-xs text-[#5A5D5A]">
                Cliente: <span className="font-semibold text-[#242423]">{customerName}</span> · {lines.length} ítem{lines.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-4">
            <div>
              <span className="text-xs text-[#5A5D5A] block uppercase font-bold tracking-wider">Total a cobrar</span>
              <span className="text-2xl font-black text-[#242423] font-mono tracking-tight">
                {currency} {total.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5] transition text-sm"
              title="Volver al carrito (Esc)"
              aria-label="Cerrar cobro"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo del Diálogo */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Selector de Método de Pago con Botones Táctiles Grandes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A] block mb-2.5">
              Método de pago
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const isSelected = paymentMethod === m.value
                const isSplitDisabled = m.value === 'split' && !allowSplitPayment

                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={isSplitDisabled}
                    onClick={() => {
                      setPaymentMethod(m.value as PaymentMethod)
                      if (m.value === 'cash') {
                        setTimeout(() => cashInputRef.current?.focus(), 50)
                      }
                    }}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 border transition-colors duration-75 ${
                      isSelected
                        ? 'bg-[#F5CB5C] text-[#242423] border-[#8A6D14] shadow-sm font-bold'
                        : isSplitDisabled
                        ? 'bg-[#E5E5E5]/50 text-[#5A5D5A]/50 border-[#CFDBD5] opacity-60 cursor-not-allowed'
                        : 'bg-white hover:bg-[#E5E5E5] text-[#242423] border-[#CFDBD5]'
                    }`}
                  >
                    {m.value === 'cash' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    {m.value === 'card' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    )}
                    {m.value === 'qr' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    )}
                    {m.value === 'transfer' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                    {m.value === 'split' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h8m-8 6h16" />
                      </svg>
                    )}
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>
            {!allowSplitPayment && (
              <p className="text-xs text-[#5A5D5A] mt-1.5 italic">
                * Los pagos divididos están disponibles a partir del Plan Pro.
              </p>
            )}
          </div>

          {/* 2. Área Interactiva según Método Seleccionado */}
          {paymentMethod === 'cash' && (
            <div className="bg-[#E8EDDF]/40 p-5 rounded-xl border border-[#CFDBD5] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#242423]">
                  Calculadora de cambio y billetes
                </span>
                {cashReceived !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCashReceived('')
                      cashInputRef.current?.focus()
                    }}
                    className="text-xs text-[#5A5D5A] hover:text-[#242423] underline"
                  >
                    Limpiar monto
                  </button>
                )}
              </div>

              {/* Billetes Rápidos Táctiles */}
              <div>
                <span className="text-xs text-[#5A5D5A] block mb-1.5 font-medium">
                  Sugerencias rápidas de efectivo:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCashReceived(Number(total.toFixed(2)))}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${
                      cashReceived === Number(total.toFixed(2))
                        ? 'bg-[#588157] text-white border-[#588157] shadow-sm'
                        : 'bg-white hover:bg-[#E5E5E5] text-[#242423] border-[#CFDBD5]'
                    }`}
                  >
                    Exacto ({currency} {total.toFixed(2)})
                  </button>

                  {config.quickCashButtons
                    .filter((b) => b >= total || total <= b * 2)
                    .slice(0, 5)
                    .map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setCashReceived(bill)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition ${
                          cashReceived === bill
                            ? 'bg-[#588157] text-white border-[#588157] shadow-sm'
                            : 'bg-white hover:bg-[#E5E5E5] text-[#242423] border-[#CFDBD5]'
                        }`}
                      >
                        {currency} {bill}
                      </button>
                    ))}
                </div>
              </div>

              {/* Input de Efectivo Recibido y Cambio a Devolver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2 border-t border-[#CFDBD5]">
                <div>
                  <label className="text-xs text-[#5A5D5A] block mb-1 font-medium">
                    Efectivo entregado por cliente:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm text-[#5A5D5A] font-mono font-bold">
                      {currency}
                    </span>
                    <input
                      ref={cashInputRef}
                      type="number"
                      step="any"
                      placeholder="0.00"
                      aria-label="Efectivo entregado por cliente"
                      value={cashReceived === '' ? '' : cashReceived}
                      onChange={(e) =>
                        setCashReceived(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full bg-white border border-[#CFDBD5] rounded-xl pl-11 pr-3 py-2.5 text-[#242423] font-mono font-bold text-base focus:outline-none focus:border-[#F5CB5C] transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="bg-white border border-[#CFDBD5] p-3.5 rounded-xl flex flex-col justify-center">
                  <span className="text-xs uppercase tracking-wider text-[#5A5D5A] font-bold block mb-0.5">
                    {cashChange !== null && cashChange >= 0
                      ? 'Cambio a devolver:'
                      : 'Falta por recibir:'}
                  </span>
                  <span
                    className={`font-mono font-extrabold text-xl ${
                      cashChange === null
                        ? 'text-[#5A5D5A]'
                        : cashChange >= 0
                        ? 'text-[#588157]'
                        : 'text-[#BC4749]'
                    }`}
                  >
                    {cashChange === null
                      ? `${currency} 0.00`
                      : `${currency} ${Math.abs(cashChange).toFixed(2)}`}
                  </span>
                  {cashChange !== null && cashChange >= 0 && (
                    <span className="text-xs text-[#588157] mt-0.5 font-medium">
                      ✓ Pago en efectivo cubierto
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="bg-[#E8EDDF]/40 p-5 rounded-xl border border-[#CFDBD5] flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-xl shrink-0">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#242423]">Pago con Tarjeta de Débito / Crédito</h4>
                <p className="text-xs text-[#5A5D5A] mt-0.5">
                  Procese el cobro de <strong className="text-[#242423] font-mono">{currency} {total.toFixed(2)}</strong> en el terminal POS físico y confirme la operación al recibir la aprobación.
                </p>
              </div>
            </div>
          )}

          {paymentMethod === 'qr' && (
            <div className="bg-[#E8EDDF]/40 p-5 rounded-xl border border-[#CFDBD5] flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#588157] rounded-xl shrink-0">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#242423]">Cobro instantáneo mediante Código QR</h4>
                <p className="text-xs text-[#5A5D5A] mt-0.5">
                  Indique al cliente que escanee el código QR estático o dinámico por <strong className="text-[#242423] font-mono">{currency} {total.toFixed(2)}</strong> y confirme la transacción tras recibir la notificación de pago.
                </p>
              </div>
            </div>
          )}

          {paymentMethod === 'transfer' && (
            <div className="bg-[#E8EDDF]/40 p-5 rounded-xl border border-[#CFDBD5] flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-600 rounded-xl shrink-0">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#242423]">Transferencia Bancaria</h4>
                <p className="text-xs text-[#5A5D5A] mt-0.5">
                  Verifique el abono de <strong className="text-[#242423] font-mono">{currency} {total.toFixed(2)}</strong> en la banca en línea de la tienda antes de cerrar la venta.
                </p>
              </div>
            </div>
          )}

          {paymentMethod === 'split' && (
            <div className="bg-[#E8EDDF]/40 p-5 rounded-xl border border-[#CFDBD5] space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#242423]">
                    Desglose de Pago Dividido
                  </h4>
                  <p className="text-xs text-[#5A5D5A]">
                    Distribuye el cobro entre dos o más modalidades de pago.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSplitRow}
                  className="px-3 py-1.5 rounded-lg bg-[#E5E5E5] text-[#242423] hover:bg-[#CFDBD5] border border-[#CFDBD5] text-xs font-medium transition flex items-center gap-1.5"
                >
                  <span>+ Agregar método</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {splitPayments.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-[#CFDBD5]"
                  >
                    <select
                      value={p.payment_method}
                      aria-label={`Método de pago de la fracción ${idx + 1}`}
                      onChange={(e) =>
                        handleSplitMethodChange(idx, e.target.value as any)
                      }
                      className="flex-1 bg-white border border-[#CFDBD5] rounded-lg px-2.5 py-1.5 text-[#242423] text-xs focus:outline-none focus:border-[#F5CB5C]"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="card">Tarjeta</option>
                      <option value="qr">Pago QR</option>
                      <option value="transfer">Transferencia</option>
                    </select>

                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1.5 text-xs text-[#5A5D5A] font-mono">
                        {currency}
                      </span>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        aria-label={`Monto para método de pago ${idx + 1}`}
                        value={p.amount || ''}
                        onChange={(e) => handleSplitAmountChange(idx, e.target.value)}
                        className="w-full bg-white border border-[#CFDBD5] rounded-lg pl-8 pr-2.5 py-1.5 text-[#242423] text-right font-mono font-bold text-xs focus:outline-none focus:border-[#F5CB5C]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAutoFillRemaining(idx)}
                      className="px-2.5 py-1.5 bg-[#E5E5E5] hover:bg-[#CFDBD5] text-[#242423] rounded-lg text-xs font-medium border border-[#CFDBD5] transition"
                      title="Asignar automáticamente el saldo restante a este método"
                    >
                      Restante
                    </button>

                    {splitPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplitRow(idx)}
                        className="text-[#5A5D5A] hover:text-[#BC4749] p-1 transition"
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Barra de Balance del Split */}
              <div className="pt-2.5 border-t border-[#CFDBD5] flex items-center justify-between text-xs">
                <span className="text-[#5A5D5A]">
                  Total distribuido: <strong className="text-[#242423] font-mono">{currency} {splitTotal.toFixed(2)}</strong> de <span className="font-mono">{currency} {total.toFixed(2)}</span>
                </span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                    Math.abs(splitDifference) < 0.01
                      ? 'bg-emerald-50 text-[#588157] border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {Math.abs(splitDifference) < 0.01
                    ? '✓ Cuadre exacto (0.00)'
                    : splitDifference > 0
                    ? `Faltan: ${currency} ${splitDifference.toFixed(2)}`
                    : `Sobra: ${currency} ${Math.abs(splitDifference).toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

          {/* 3. Recibo Digital Opcional */}
          <div>
            <label className="text-xs font-semibold text-[#5A5D5A] block mb-1">
              Enviar comprobante digital por correo (opcional):
            </label>
            <input
              type="email"
              placeholder="cliente@ejemplo.com"
              aria-label="Correo electrónico para enviar comprobante digital"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full bg-white border border-[#CFDBD5] rounded-xl px-3.5 py-2 text-[#242423] text-xs placeholder:text-[#5A5D5A]/60 focus:outline-none focus:border-[#F5CB5C] transition"
            />
          </div>
        </div>

        {/* Pie de Acciones */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#CFDBD5] bg-[#E8EDDF]/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#5A5D5A] hover:text-[#242423] transition flex items-center gap-1.5"
          >
            <span>← Volver al carrito (Esc)</span>
          </button>

          <button
            type="button"
            disabled={isSaving || (paymentMethod === 'split' && Math.abs(splitDifference) > 0.05)}
            onClick={handleSubmitSale}
            className="px-6 py-3 rounded-xl bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-bold text-sm transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#F5CB5C]/10 active:scale-[0.99]"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Procesando venta...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Confirmar venta · {currency} {total.toFixed(2)} (Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

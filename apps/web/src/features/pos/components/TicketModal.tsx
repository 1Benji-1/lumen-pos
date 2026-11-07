import { useState, useEffect } from 'react'
import type { CartLine } from '../hooks/useCart'
import type { PaymentMethod, PaymentSplitItem } from '@lumen-pos/types'
import { useSendDigitalReceipt } from '../hooks/useSales'
import { useRetailSubrubro } from '../../../shared/hooks/useRetailSubrubro'
import { useStoreSettings } from '../../settings/hooks/useStoreSettings'
import { useCurrentUserRole } from '../../../shared/hooks/useCurrentUserRole'

export function TicketModal({
  saleId,
  lines,
  subtotal,
  discount,
  total,
  paymentMethod,
  payments,
  customerEmail,
  storeName,
  storeId,
  cashierName,
  onClose,
  onPrint,
}: {
  saleId: string
  lines: CartLine[]
  subtotal?: number
  discount?: number
  total: number
  paymentMethod: PaymentMethod
  payments?: PaymentSplitItem[]
  customerEmail?: string | null
  storeName?: string
  storeId?: string
  cashierName?: string | null
  onClose: () => void
  onPrint: () => void
}) {
  const { config } = useRetailSubrubro()
  const { settings } = useStoreSettings(storeId)
  const currency = settings?.currency_symbol || 'Bs'
  const displayName = settings?.commercial_name || storeName || 'LUMEN POS'
  const ticketFooter = settings?.ticket_footer || config.defaultTicketPolicy || '¡Gracias por su compra!'
  const { fullName: userFullName } = useCurrentUserRole()
  const cashier = cashierName || userFullName || 'Cajero'

  const paymentLabels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    qr: 'Pago QR',
    transfer: 'Transferencia bancaria',
    split: 'Pago dividido',
  }

  const [emailInput, setEmailInput] = useState(customerEmail || '')
  const [emailSent, setEmailSent] = useState(false)
  const sendReceipt = useSendDigitalReceipt()

  // Cerrar con tecla Escape de forma instantánea
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!emailInput.trim()) return

    await sendReceipt.mutateAsync({
      toEmail: emailInput.trim(),
      saleId,
      lines,
      total,
      subtotal,
      discount,
      paymentMethod: paymentLabels[paymentMethod] || paymentMethod,
      payments,
      storeName: displayName,
    })
    setEmailSent(true)
  }

  return (
    <div className="fixed inset-0 bg-[#242423]/60 flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden">
      <div className="bg-white text-[#242423] w-96 max-w-full rounded-2xl border border-[#CFDBD5] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden print:max-h-none print:overflow-visible print:border-none print:shadow-none print:w-full">
        {/* Barra Superior Fija con Botón de Cierre Rápido (Oculta al Imprimir) */}
        <div className="shrink-0 px-4 py-2.5 border-b border-[#CFDBD5] bg-[#E8EDDF]/40 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-1.5 text-xs text-[#242423] font-bold">
            <svg className="w-4 h-4 text-[#588157]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>Venta completada #{saleId.slice(0, 8)}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5] transition flex items-center justify-center text-xs"
            title="Cerrar comprobante (Esc)"
            aria-label="Cerrar ticket"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Ticket con Scroll Independiente */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-3.5 scrollbar-thin print:p-0 print:overflow-visible">
          {/* Encabezado del Comercio */}
          <div className="text-center space-y-0.5">
            {settings?.print_logo_on_ticket && settings?.logo_url && (
              <div className="flex justify-center mb-1.5">
                <img
                  src={settings.logo_url}
                  alt={displayName}
                  className="max-h-12 max-w-[130px] object-contain"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLElement).style.display = 'none'
                  }}
                />
              </div>
            )}
            <h2 className="font-bold text-base tracking-wider uppercase text-[#242423]">
              {displayName}
            </h2>
            {settings?.tax_id && (
              <p className="text-[10px] text-gray-500 font-sans">NIT/RUC: {settings.tax_id}</p>
            )}
            {settings?.address && (
              <p className="text-[10px] text-gray-500 font-sans">{settings.address}</p>
            )}
            {settings?.phone && (
              <p className="text-[10px] text-gray-500 font-sans">Tel: {settings.phone}</p>
            )}
            {settings?.ticket_header && (
              <p className="text-[10px] text-gray-600 font-medium italic pt-0.5">{settings.ticket_header}</p>
            )}
            <p className="text-[11px] text-gray-600 pt-1 font-semibold">Comprobante de venta</p>
            <p className="text-[10px] text-gray-500">
              Venta #{saleId.slice(0, 8)} • {new Date().toLocaleDateString()}{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {settings?.print_cashier_name && (
              <p className="text-[10px] text-gray-600 font-sans font-medium pt-0.5">
                Atendido por: <span className="text-gray-900 font-bold">{cashier}</span>
              </p>
            )}
          </div>

          {/* Líneas de productos (con scroll si la lista es muy extensa) */}
          <div className="border-t border-b border-dashed border-gray-400 py-2.5 space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin print:max-h-none print:overflow-visible">
            {lines.map((line) => {
              const lineTotal = Math.max(0, line.unitPrice * line.quantity - (line.discount || 0))
              return (
                <div key={line.variantId} className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0 pr-1">
                    <span className="font-bold block leading-snug">
                      {line.quantity} {line.unit || 'u'} x {line.productName}
                    </span>
                    {line.variantName !== 'Único' && (
                      <span className="text-[10px] text-gray-500 block">{line.variantName}</span>
                    )}
                    {Number(line.discount) > 0 && (
                      <span className="text-[10px] text-[#588157] block font-semibold">
                        Desc: -{currency} {Number(line.discount).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-right shrink-0">{currency} {lineTotal.toFixed(2)}</span>
                </div>
              )
            })}
          </div>

          {/* Resumen de totales */}
          <div className="space-y-1 text-[11px]">
            {(discount || 0) > 0 && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{currency} {(subtotal ?? total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#588157] font-semibold">
                  <span>Descuento global</span>
                  <span>-{currency} {(discount ?? 0).toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-gray-300 text-[#242423]">
              <span>TOTAL PAGADO</span>
              <span>{currency} {total.toFixed(2)}</span>
            </div>

            <div className="pt-1.5 text-[10px] text-gray-600">
              <span>Método: <strong>{paymentLabels[paymentMethod] || paymentMethod}</strong></span>
              {payments && payments.length > 0 && (
                <div className="mt-1 pl-2 border-l-2 border-gray-300 space-y-0.5">
                  {payments.map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{paymentLabels[p.payment_method] || p.payment_method}:</span>
                      <span>{currency} {Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leyenda y política personalizada o según sub-rubro */}
            <div className="pt-2 text-[10px] text-gray-500 text-center border-t border-dashed border-gray-300 italic">
              <p>{ticketFooter}</p>
            </div>

            {/* Leyenda legal personalizada */}
            {settings?.ticket_legal_disclaimer && (
              <div className="pt-1.5 text-[9px] text-gray-500 text-center border-t border-dotted border-gray-300 font-sans uppercase tracking-tight leading-snug">
                <p>{settings.ticket_legal_disclaimer}</p>
              </div>
            )}
          </div>

          {/* Sección de Recibo Digital por Correo */}
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 print:hidden space-y-1.5">
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
              Recibo digital por correo
            </span>

            {emailSent ? (
              <div className="bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8] p-2 rounded-lg text-xs text-center font-medium">
                ✓ Comprobante enviado a {emailInput}
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="flex gap-1.5">
                <input
                  type="email"
                  placeholder="cliente@correo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  className="flex-1 border border-[#CFDBD5] rounded-lg px-2.5 py-1.5 text-xs bg-white text-[#242423] focus:outline-none focus:border-[#242423]"
                />
                <button
                  type="submit"
                  disabled={sendReceipt.isPending}
                  className="bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-bold px-3 py-1.5 rounded-lg text-xs transition disabled:opacity-50 shadow-2xs shrink-0 active:scale-[0.98]"
                >
                  {sendReceipt.isPending ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Botones de Acción Fijos al Pie (Siempre Visibles y Accesibles) */}
        <div className="shrink-0 p-3.5 border-t border-[#CFDBD5] bg-[#E8EDDF]/30 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={onPrint}
            className="flex-1 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
          >
            <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir ticket</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-[#E5E5E5] text-[#242423] border border-[#CFDBD5] font-semibold px-4 py-2.5 rounded-xl transition text-xs shadow-2xs active:scale-[0.99]"
          >
            Cerrar (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}
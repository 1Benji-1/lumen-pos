import type { CartLine } from '../hooks/useCart'

export function TicketModal({
  saleId,
  lines,
  total,
  paymentMethod,
  onClose,
  onPrint,
}: {
  saleId: string
  lines: CartLine[]
  total: number
  paymentMethod: 'cash' | 'card'
  onClose: () => void
  onPrint: () => void
}) {
  const paymentLabels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta / QR',
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white text-black w-80 p-4 font-mono text-sm">
        <h2 className="text-center font-bold mb-2">LUMEN POS</h2>
        <p className="text-center text-xs mb-4">Comprobante de venta</p>

        <p className="text-xs text-gray-500 mb-2">Venta #{saleId.slice(0, 8)}</p>

        <div className="border-t border-b border-dashed border-black py-2 space-y-1">
          {lines.map((line) => (
            <div key={line.variantId} className="flex justify-between">
              <span>
                {line.quantity}x {line.productName}
              </span>
              <span>Bs {(line.unitPrice * line.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between font-bold mt-2 text-base">
          <span>TOTAL</span>
          <span>Bs {total.toFixed(2)}</span>
        </div>

        <p className="text-xs mt-2">Método de pago: {paymentLabels[paymentMethod]}</p>

        <div className="flex gap-2 mt-4 print:hidden">
          <button onClick={onPrint} className="flex-1 bg-blue-600 text-white rounded py-2">
            Imprimir
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-300 rounded py-2">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
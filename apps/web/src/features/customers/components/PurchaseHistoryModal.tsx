import { useCustomerPurchaseHistory } from '../hooks/useCustomers'
import type { CustomerWithMetrics } from '@lumen-pos/types'

interface PurchaseHistoryModalProps {
  customer?: CustomerWithMetrics | null
  customerId?: string
  onClose: () => void
}

export function PurchaseHistoryModal({
  customer,
  customerId,
  onClose,
}: PurchaseHistoryModalProps) {
  const targetId = customer?.id || customerId
  const { data: sales, isLoading } = useCustomerPurchaseHistory(targetId || null)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-history-title"
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white border border-[#CFDBD5] text-[#242423] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabecera */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#CFDBD5] bg-[#E8EDDF]/40">
          <div>
            <h2 id="purchase-history-title" className="text-lg font-bold text-[#242423] tracking-tight">
              Historial de compras
            </h2>
            <p className="text-xs text-[#5A5D5A] mt-0.5">
              Cliente:{' '}
              <span className="font-semibold text-[#242423]">
                {customer?.full_name || 'Seleccionado'}
              </span>
              {customer?.phone ? (
                <>
                  {' • '}
                  <span className="font-mono tabular-nums">{customer.phone}</span>
                </>
              ) : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar historial"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] transition flex items-center justify-center cursor-pointer"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Resumen Superior */}
        {customer && (
          <div className="grid grid-cols-2 gap-4 px-6 py-3 bg-[#E8EDDF]/50 border-b border-[#CFDBD5] text-xs">
            <div>
              <span className="text-[#5A5D5A] block">Total de compras:</span>
              <span className="font-semibold text-[#242423] font-mono tabular-nums">
                {customer.total_purchases} transacciones
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#5A5D5A] block">Gasto acumulado:</span>
              <span className="font-mono font-bold text-[#588157] tabular-nums">
                Bs {customer.total_spent.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Lista de Compras */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-8 text-center text-[#5A5D5A] text-xs">
              <p>Cargando historial de compras...</p>
            </div>
          ) : !sales || sales.length === 0 ? (
            <div className="py-8 text-center text-[#5A5D5A] text-xs">
              <p>Este cliente no tiene compras registradas en el sistema.</p>
            </div>
          ) : (
            sales.map((sale) => (
              <div
                key={sale.id}
                className="p-4 rounded-lg bg-white border border-[#CFDBD5] space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A5D5A] font-mono tabular-nums">
                    {new Date(sale.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    •{' '}
                    {new Date(sale.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                      sale.status === 'completed'
                        ? 'bg-[#EFF5EE] text-[#588157] border-[#BBD2B8]'
                        : sale.status === 'refunded'
                        ? 'bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4]'
                        : 'bg-[#E5E5E5] text-[#5A5D5A] border-[#CFDBD5]'
                    }`}
                  >
                    {sale.status === 'completed'
                      ? 'Completada'
                      : sale.status === 'refunded'
                      ? 'Reembolsada'
                      : sale.status}
                  </span>
                </div>

                <div className="border-t border-[#CFDBD5] pt-2 space-y-1">
                  {(sale.sale_items ?? []).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-xs text-[#242423]"
                    >
                      <span>
                        <span className="font-semibold text-[#5A5D5A] font-mono tabular-nums">
                          {item.quantity}x
                        </span>{' '}
                        {item.product_variants?.name || 'Artículo'}
                      </span>
                      <span className="font-mono text-[#242423] tabular-nums">
                        Bs {Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#CFDBD5] pt-2 flex items-center justify-between text-xs">
                  <span className="text-[#5A5D5A] capitalize">
                    Método: {sale.payment_method}
                  </span>
                  <div className="font-mono font-bold text-[#242423] text-sm tabular-nums">
                    Total: Bs {Number(sale.total).toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#CFDBD5] bg-[#E8EDDF]/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-white hover:bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
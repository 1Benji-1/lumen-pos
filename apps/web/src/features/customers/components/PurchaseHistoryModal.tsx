import { useCustomerPurchaseHistory } from '../hooks/useCustomers'

export function PurchaseHistoryModal({
  customerId,
  onClose,
}: {
  customerId: string
  onClose: () => void
}) {
  const { data: sales, isLoading } = useCustomerPurchaseHistory(customerId)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 text-white w-full max-w-lg p-6 rounded max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Historial de compras</h2>
          <button onClick={onClose} className="text-slate-400">
            ✕
          </button>
        </div>

        {isLoading ? (
          <p>Cargando...</p>
        ) : !sales || sales.length === 0 ? (
          <p className="text-slate-400">Este cliente no tiene compras registradas.</p>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale.id} className="border-b border-slate-700 pb-3">
                <p className="text-sm text-slate-400">
                  {new Date(sale.created_at).toLocaleString()}
                </p>
                <ul className="text-sm ml-2">
                  {sale.sale_items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}x {item.product_variants?.name} — Bs {item.subtotal}
                    </li>
                  ))}
                </ul>
                <p className="font-bold text-right">Total: Bs {sale.total}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
import { useState } from 'react'
import type { CartLine } from '../hooks/useCart'
import { useCustomers, useCreateCustomer } from '../../customers/hooks/useCustomers'

export function CartDrawer({
  storeId,
  lines,
  total,
  onUpdateQuantity,
  onRemoveItem,
  onConfirmSale,
  isSaving,
}: {
  storeId: string
  lines: CartLine[]
  total: number
  onUpdateQuantity: (variantId: string, quantity: number) => void
  onRemoveItem: (variantId: string) => void
  onConfirmSale: (paymentMethod: 'cash' | 'card', customerId: string | null) => void
  isSaving: boolean
}) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [customerId, setCustomerId] = useState<string>('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const { data: customers } = useCustomers(storeId)
  const createCustomer = useCreateCustomer(storeId)

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault()
    const created = await createCustomer.mutateAsync({ full_name: newName, phone: newPhone })
    setCustomerId(created.id)
    setShowNewCustomer(false)
    setNewName('')
    setNewPhone('')
  }

  return (
    <div className="bg-slate-900 text-white p-4 w-full max-w-sm flex flex-col h-full">
      <h2 className="text-lg font-bold mb-4">Carrito</h2>

      {lines.length === 0 ? (
        <p className="text-slate-400 text-sm">Agrega productos para empezar la venta.</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {lines.map((line) => (
            <div key={line.variantId} className="flex justify-between items-center text-sm">
              <div>
                <p>{line.productName}</p>
                <p className="text-slate-400">
                  Bs {line.unitPrice} x {line.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={line.stockAvailable}
                  value={line.quantity}
                  onChange={(e) => onUpdateQuantity(line.variantId, Number(e.target.value))}
                  className="w-14 rounded px-1 py-1 text-black text-center"
                />
                <button onClick={() => onRemoveItem(line.variantId)} className="text-red-400">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-700 mt-4 pt-4 space-y-3">
        <p className="text-xl font-bold">Total: Bs {total.toFixed(2)}</p>

        {!showNewCustomer ? (
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Cliente (opcional)</label>
            <div className="flex gap-2">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="flex-1 rounded px-3 py-2 text-black text-sm"
              >
                <option value="">Sin cliente</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewCustomer(true)}
                className="bg-slate-700 rounded px-3 text-sm"
                type="button"
              >
                + Nuevo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateCustomer} className="space-y-2 bg-slate-800 p-3 rounded">
            <p className="text-xs text-slate-400">Registrar cliente rápido</p>
            <input
              type="text"
              placeholder="Nombre completo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full rounded px-3 py-2 text-black text-sm"
            />
            <input
              type="text"
              placeholder="Teléfono (opcional)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full rounded px-3 py-2 text-black text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createCustomer.isPending}
                className="flex-1 bg-green-600 rounded py-1 text-sm disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowNewCustomer(false)}
                className="flex-1 bg-slate-600 rounded py-1 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
          className="w-full rounded px-3 py-2 text-black"
        >
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta / QR</option>
        </select>

        <button
          disabled={lines.length === 0 || isSaving}
          onClick={() => onConfirmSale(paymentMethod, customerId || null)}
          className="w-full bg-green-600 rounded py-2 disabled:opacity-50"
        >
          {isSaving ? 'Procesando...' : 'Confirmar venta'}
        </button>
      </div>
    </div>
  )
}
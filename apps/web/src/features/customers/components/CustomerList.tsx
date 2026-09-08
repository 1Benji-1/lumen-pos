import { useState } from 'react'
import { useCustomers, useCreateCustomer } from '../hooks/useCustomers'
import { PurchaseHistoryModal } from './PurchaseHistoryModal'

export function CustomerList({ storeId }: { storeId: string }) {
  const { data: customers, isLoading } = useCustomers(storeId)
  const createCustomer = useCreateCustomer(storeId)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createCustomer.mutateAsync({ full_name: fullName, phone, email })
    setFullName('')
    setPhone('')
    setEmail('')
  }

  return (
    <div className="p-8 text-white">
      <h1 className="text-xl font-bold mb-4">Clientes</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6 max-w-2xl">
        <input
          type="text"
          placeholder="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="flex-1 rounded px-3 py-2 text-black"
        />
        <input
          type="text"
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 rounded px-3 py-2 text-black"
        />
        <input
          type="email"
          placeholder="Correo (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded px-3 py-2 text-black"
        />
        <button
          type="submit"
          disabled={createCustomer.isPending}
          className="bg-blue-600 rounded px-4 disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="py-2">Nombre</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <tr key={c.id} className="border-b border-slate-800">
                <td className="py-2">{c.full_name}</td>
                <td>{c.phone ?? '—'}</td>
                <td>{c.email ?? '—'}</td>
                <td>
                  <button
                    onClick={() => setSelectedCustomerId(c.id)}
                    className="text-blue-400 text-sm"
                  >
                    Ver historial
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedCustomerId && (
        <PurchaseHistoryModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  )
}
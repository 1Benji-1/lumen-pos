import { useState } from 'react'
import { useOpenRegisterMutation, useCloseRegisterMutation } from '../hooks/useCashRegister'

export function OpenRegisterForm({
  storeId,
  userId,
}: {
  storeId: string
  userId: string
}) {
  const openRegister = useOpenRegisterMutation(storeId)
  const [amount, setAmount] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await openRegister.mutateAsync({ userId, openingAmount: Number(amount) || 0 })
  }

  return (
    <form onSubmit={handleSubmit} className="text-white max-w-sm space-y-3 p-8">
      <h2 className="text-xl font-bold">Abrir caja</h2>
      <p className="text-slate-400 text-sm">
        Ingresa el monto en efectivo con el que empiezas el día.
      </p>
      <input
        type="number"
        step="0.01"
        placeholder="Monto inicial"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="w-full rounded px-3 py-2 text-black"
      />
      <button
        type="submit"
        disabled={openRegister.isPending}
        className="w-full bg-green-600 rounded py-2 disabled:opacity-50"
      >
        {openRegister.isPending ? 'Abriendo...' : 'Abrir caja'}
      </button>
    </form>
  )
}

export function CloseRegisterButton({
  storeId,
  cashRegisterId,
}: {
  storeId: string
  cashRegisterId: string
}) {
  const closeRegister = useCloseRegisterMutation(storeId)
  const [show, setShow] = useState(false)
  const [amount, setAmount] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await closeRegister.mutateAsync({ id: cashRegisterId, closingAmount: Number(amount) || 0 })
    setShow(false)
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="text-red-400 text-sm underline">
        Cerrar caja
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="text-white space-y-2 mt-2">
      <input
        type="number"
        step="0.01"
        placeholder="Monto final en caja"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="rounded px-3 py-2 text-black"
      />
      <button
        type="submit"
        disabled={closeRegister.isPending}
        className="bg-red-600 rounded px-4 py-2 ml-2 disabled:opacity-50"
      >
        Confirmar cierre
      </button>
    </form>
  )
}
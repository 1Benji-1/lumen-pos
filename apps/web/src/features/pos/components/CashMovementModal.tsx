import { useState, useEffect } from 'react'
import { useAddCashMovementMutation } from '../hooks/useCashRegister'
import type { CashMovementType } from '@lumen-pos/types'

export function CashMovementModal({
  storeId,
  cashRegisterId,
  userId,
  initialType = 'in',
  onClose,
}: {
  storeId: string
  cashRegisterId: string
  userId: string
  initialType?: CashMovementType
  onClose: () => void
}) {
  const addMovement = useAddCashMovementMutation(storeId, cashRegisterId)
  const [type, setType] = useState<CashMovementType>(initialType)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Ingrese un monto válido mayor a cero.')
      return
    }
    if (!reason.trim()) {
      setError('El motivo del movimiento es obligatorio.')
      return
    }

    try {
      await addMovement.mutateAsync({
        userId,
        type,
        amount: numAmount,
        reason: reason.trim(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el movimiento')
    }
  }

  return (
    <div className="fixed inset-0 bg-[#242423]/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-[#CFDBD5] rounded-2xl max-w-md w-full p-6 text-[#242423] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-[#CFDBD5]">
          <h2 className="text-lg font-bold text-[#242423]">
            {type === 'in' ? 'Ingreso de efectivo' : 'Retiro de efectivo'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5] transition flex items-center justify-center text-xs"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('in')}
                className={`py-2 text-xs font-semibold rounded-md border transition shadow-xs ${
                  type === 'in'
                    ? 'bg-[#EFF5EE] border-[#BBD2B8] text-[#588157]'
                    : 'bg-[#E5E5E5]/50 border-[#CFDBD5] text-[#5A5D5A] hover:bg-[#E5E5E5]'
                }`}
              >
                Ingreso de efectivo
              </button>
              <button
                type="button"
                onClick={() => setType('out')}
                className={`py-2 text-xs font-semibold rounded-md border transition shadow-xs ${
                  type === 'out'
                    ? 'bg-[#FEF9E7] border-[#F5CB5C]/50 text-[#8A6D14]'
                    : 'bg-[#E5E5E5]/50 border-[#CFDBD5] text-[#5A5D5A] hover:bg-[#E5E5E5]'
                }`}
              >
                Retiro de efectivo
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Monto en efectivo (Bs)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              aria-label="Monto del movimiento de efectivo en Bs"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full rounded-md border border-[#CFDBD5] px-3.5 py-2 text-[#242423] bg-white text-xs focus:outline-none focus:border-[#242423] shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Motivo obligatorio
            </label>
            <textarea
              placeholder={
                type === 'in'
                  ? 'Ej. Cambio adicional, reposición de fondo'
                  : 'Ej. Pago a proveedor, gastos de caja chica'
              }
              aria-label="Motivo obligatorio del movimiento"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full rounded-md border border-[#CFDBD5] px-3.5 py-2 text-[#242423] bg-white text-xs focus:outline-none focus:border-[#242423] shadow-xs"
            />
          </div>

          {error && <p className="text-[#BC4749] text-xs font-medium">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#242423] bg-[#E5E5E5] hover:bg-[#D5D5D5] rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addMovement.isPending}
              className="px-4 py-2 text-xs font-bold rounded-md transition text-[#242423] bg-[#F5CB5C] hover:bg-[#E5B946] shadow-xs disabled:opacity-50"
            >
              {addMovement.isPending ? 'Registrando...' : 'Confirmar movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

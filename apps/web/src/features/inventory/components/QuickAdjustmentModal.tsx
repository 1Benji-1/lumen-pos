import { useState, useEffect } from 'react'
import { useProducts, useAdjustVariantStock } from '../hooks/useProducts'
import type { StockMovementType } from '@lumen-pos/types'

interface QuickAdjustmentModalProps {
  storeId: string
  onClose: () => void
  initialVariantId?: string
}

export function QuickAdjustmentModal({ storeId, onClose, initialVariantId }: QuickAdjustmentModalProps) {
  const { data: products } = useProducts(storeId)
  const adjustStock = useAdjustVariantStock(storeId)

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId || '')
  const [adjustmentType, setAdjustmentType] = useState<StockMovementType>('manual_adjustment')
  const [mode, setMode] = useState<'relative' | 'absolute'>('relative')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const allVariants = (products ?? []).flatMap((p) =>
    p.product_variants.map((v) => ({
      ...v,
      productName: p.name,
    }))
  )

  const selectedVariant = allVariants.find((v) => v.id === selectedVariantId)
  const currentStock = selectedVariant ? Number(selectedVariant.stock_quantity) : 0

  // Calcular nuevo stock según modo
  const numQty = Number(quantity) || 0
  let calculatedNewStock = currentStock
  if (mode === 'absolute') {
    calculatedNewStock = numQty
  } else {
    // Si es relativo: según el tipo sumamos o restamos
    if (adjustmentType === 'waste' || adjustmentType === 'supplier_return') {
      calculatedNewStock = Math.max(0, currentStock - numQty)
    } else {
      calculatedNewStock = currentStock + numQty
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedVariantId) {
      setError('Seleccione un producto')
      return
    }
    if (!reason.trim()) {
      setError('Indique el motivo del ajuste')
      return
    }
    if (calculatedNewStock < 0) {
      setError('El stock final no puede ser negativo')
      return
    }

    try {
      await adjustStock.mutateAsync({
        variantId: selectedVariantId,
        newStock: calculatedNewStock,
        type: adjustmentType,
        reason: reason.trim(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar ajuste de stock')
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 animate-modal-backdrop"
    >
      <div className="bg-white border border-[#CFDBD5] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-[#242423] animate-modal-panel">
        <div className="flex justify-between items-center border-b border-[#CFDBD5] pb-3">
          <h3 className="font-bold text-base text-[#242423]">Registrar ajuste de stock</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded-lg hover:bg-[#E8EDDF] transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Producto *
            </label>
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              required
              className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
            >
              <option value="">Seleccionar producto...</option>
              {allVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.productName} {v.name !== 'Único' ? `(${v.name})` : ''} — Stock actual:{' '}
                  {Number(v.stock_quantity)} {v.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                Tipo de movimiento
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as StockMovementType)}
                className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
              >
                <option value="manual_adjustment">Ajuste manual (+/-)</option>
                <option value="waste">Merma / Pérdida (-)</option>
                <option value="supplier_return">Devolución a proveedor (-)</option>
                <option value="physical_count">Conteo físico</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                Modo de ingreso
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'relative' | 'absolute')}
                className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
              >
                <option value="relative">Cantidad a cambiar (+/-)</option>
                <option value="absolute">Fijar nuevo stock total</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              {mode === 'relative'
                ? adjustmentType === 'waste' || adjustmentType === 'supplier_return'
                  ? 'Cantidad a descontar'
                  : 'Cantidad a sumar o restar (+/-)'
                : 'Nuevo stock total'}
            </label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              placeholder="0"
              className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm tabular-nums focus:outline-none focus:border-[#242423]"
            />
          </div>

          {selectedVariant && (
            <div className="bg-[#E8EDDF]/40 p-3 rounded-lg border border-[#CFDBD5] text-xs flex justify-between items-center">
              <div>
                <span className="text-[#5A5D5A] block">Stock actual</span>
                <span className="font-semibold text-[#242423] tabular-nums">
                  {currentStock} {selectedVariant.unit}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#5A5D5A] block">Nuevo stock resultante</span>
                <span
                  className={`font-bold tabular-nums ${
                    calculatedNewStock < currentStock
                      ? 'text-[#BC4749]'
                      : calculatedNewStock > currentStock
                        ? 'text-[#588157]'
                        : 'text-[#242423]'
                  }`}
                >
                  {calculatedNewStock} {selectedVariant.unit}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Motivo o justificación *
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Producto dañado en góndola, vencido, ajuste por rotura..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
            />
          </div>

          {error && <p className="text-[#BC4749] text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white hover:bg-[#E8EDDF] text-[#242423] font-medium py-2 rounded-md text-sm border border-[#CFDBD5] transition shadow-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={adjustStock.isPending}
              className="flex-1 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-semibold py-2 rounded-md text-sm transition shadow-xs disabled:opacity-50"
            >
              {adjustStock.isPending ? 'Guardando...' : 'Aplicar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default QuickAdjustmentModal

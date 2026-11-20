import { useState, useEffect } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useSuppliers } from '../hooks/useSuppliers'
import { useUpdateProductWithVariant } from '../hooks/useProducts'
import { generateInternalBarcode } from '../utils/barcodeGenerator'
import { PRODUCT_UNITS, type ProductUnit } from '@lumen-pos/types'

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  product: any
  variant: any
}

export function EditProductModal({
  isOpen,
  onClose,
  storeId,
  product,
  variant,
}: EditProductModalProps) {
  const { data: categories } = useCategories(storeId)
  const { data: suppliers } = useSuppliers(storeId)
  const updateProduct = useUpdateProductWithVariant(storeId)

  // Estados del producto
  const [productName, setProductName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')

  // Estados de la variante
  const [variantName, setVariantName] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [barcode, setBarcode] = useState('')
  const [sku, setSku] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [unit, setUnit] = useState<ProductUnit>('unit')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [stockQuantity, setStockQuantity] = useState('0')

  // Control de lotes y vencimiento
  const [trackBatch, setTrackBatch] = useState(false)
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  // Motivo de ajuste si cambia el stock
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const currentStock = variant ? Number(variant.stock_quantity) || 0 : 0
  const isStockModified =
    stockQuantity !== '' && !isNaN(Number(stockQuantity)) && Number(stockQuantity) !== currentStock
  const stockDiff = isStockModified ? Number(stockQuantity) - currentStock : 0

  useEffect(() => {
    if (product && variant) {
      setProductName(product.name || '')
      setCategoryId(product.category_id || '')
      setDescription(product.description || '')
      setVariantName(variant.name || 'Único')
      setSalePrice(String(variant.sale_price ?? ''))
      setCostPrice(String(variant.cost_price ?? ''))
      setBarcode(variant.barcode || '')
      setSku(variant.sku || '')
      setSupplierId(variant.supplier_id || '')
      setUnit((variant.unit as ProductUnit) || 'unit')
      setLowStockThreshold(String(variant.low_stock_threshold ?? 5))
      setStockQuantity(String(variant.stock_quantity ?? 0))
      setTrackBatch(Boolean(variant.track_batch))
      setBatchNumber(variant.batch_number || '')
      setExpiryDate(variant.expiry_date || '')
      setStockAdjustmentReason('')
      setErrorMessage(null)
    }
  }, [product, variant, isOpen])

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !product || !variant) return null

  function handleGenerateBarcode() {
    setBarcode(generateInternalBarcode())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)

    if (!productName.trim()) {
      setErrorMessage('El nombre del producto es obligatorio.')
      return
    }

    const numSalePrice = parseFloat(salePrice)
    if (isNaN(numSalePrice) || numSalePrice < 0) {
      setErrorMessage('El precio de venta debe ser un número válido mayor o igual a 0.')
      return
    }

    const numCostPrice = parseFloat(costPrice) || 0
    const numStock = parseFloat(stockQuantity) || 0
    const numThreshold = Number(lowStockThreshold) || 5

    try {
      await updateProduct.mutateAsync({
        productId: product.id,
        variantId: variant.id,
        product: {
          name: productName.trim(),
          categoryId: categoryId || null,
          description: description.trim() || null,
        },
        variant: {
          name: variantName.trim() || 'Único',
          barcode: barcode || null,
          sku: sku || null,
          salePrice: numSalePrice,
          costPrice: numCostPrice,
          unit,
          lowStockThreshold: numThreshold,
          supplierId: supplierId || null,
          trackBatch,
          batchNumber: trackBatch ? batchNumber : null,
          expiryDate: trackBatch && expiryDate ? expiryDate : null,
          stockQuantity: numStock,
        },
        currentStock,
        stockAdjustmentReason: isStockModified ? stockAdjustmentReason : undefined,
      })

      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar el producto.')
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 overflow-y-auto animate-modal-backdrop"
    >
      <div className="bg-white border border-[#CFDBD5] rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-panel">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#CFDBD5] bg-[#E8EDDF]/40">
          <div>
            <h2 className="text-lg font-bold text-[#242423] tracking-tight">Editar producto</h2>
            <p className="text-xs text-[#5A5D5A] mt-0.5">
              Actualiza datos generales, precios, inventario o datos de lote y trazabilidad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] text-xs flex items-start gap-2 shadow-xs">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sección 1: Datos Generales */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#242423] border-b border-[#CFDBD5] pb-1.5">
              Información general
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Nombre del producto <span className="text-[#BC4749]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
                >
                  <option value="">Sin categoría asignada</option>
                  {(categories ?? []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Nombre de variante / presentación
                </label>
                <input
                  type="text"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="Ej. Único, 1 Litro, Talla M..."
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Proveedor
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
                >
                  <option value="">Sin proveedor asignado</option>
                  {(suppliers ?? []).map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                Descripción (opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles sobre el producto, características, origen..."
                className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition resize-none placeholder:text-[#5A5D5A]"
              />
            </div>
          </div>

          {/* Sección 2: Identificación y Códigos */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#242423] border-b border-[#CFDBD5] pb-1.5">
              Identificación y códigos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#5A5D5A]">
                    Código de barras
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-xs text-[#242423] font-medium hover:underline"
                  >
                    Generar interno
                  </button>
                </div>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Escanea o ingresa el código"
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  SKU (Código interno)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ej. BEB-JUG-01"
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Precios e Inventario */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#242423] border-b border-[#CFDBD5] pb-1.5">
              Precios e inventario
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Precio de venta (Bs) <span className="text-[#BC4749]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Precio de costo (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Unidad de medida
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as ProductUnit)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
                >
                  {PRODUCT_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Stock actual disponible
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className={`w-full bg-[#E8EDDF]/20 border rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none transition ${
                    isStockModified
                      ? 'border-[#F5CB5C] ring-1 ring-[#F5CB5C]'
                      : 'border-[#CFDBD5] focus:border-[#242423]'
                  }`}
                />
                <span className="text-xs text-[#5A5D5A] mt-1 block">
                  Existencias registradas en sistema: <strong>{currentStock}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Umbral de stock mínimo (alerta)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Aviso visual y motivo si el stock cambió */}
            {isStockModified && (
              <div className="p-3.5 rounded-lg bg-[#FEF9E7] border border-[#F5CB5C]/50 text-[#8A6D14] text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#8A6D14]">
                  <svg className="w-4 h-4 text-[#8A6D14] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>
                    Ajuste de inventario detectado ({currentStock} → {stockQuantity} • {stockDiff > 0 ? `+${stockDiff}` : stockDiff})
                  </span>
                </div>
                <p className="text-[#5A5D5A]">
                  Este cambio generará automáticamente un movimiento auditado en el{' '}
                  <strong className="text-[#242423]">Historial de movimientos</strong>.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[#8A6D14] mb-1">
                    Motivo del ajuste (opcional):
                  </label>
                  <input
                    type="text"
                    value={stockAdjustmentReason}
                    onChange={(e) => setStockAdjustmentReason(e.target.value)}
                    placeholder="Ej. Recuento físico, merma, corrección de inventario..."
                    className="w-full bg-white border border-[#CFDBD5] rounded-md px-2.5 py-1.5 text-xs text-[#242423] placeholder:text-[#5A5D5A] focus:outline-none focus:border-[#242423]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sección 4: Control de Lotes y Vencimiento */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-[#CFDBD5] pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242423]">
                Control de lotes y vencimiento
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackBatch}
                  onChange={(e) => setTrackBatch(e.target.checked)}
                  className="w-4 h-4 rounded text-[#242423] border-[#CFDBD5]"
                />
                <span className="text-xs text-[#242423]">Habilitar lote para este producto</span>
              </label>
            </div>

            {trackBatch && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-[#E8EDDF]/30 border border-[#CFDBD5]">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                    Número de lote
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Ej. LOT-2026-09"
                    className="w-full bg-white border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                    Fecha de vencimiento
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-white border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#CFDBD5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#242423] hover:bg-[#E8EDDF] bg-white border border-[#CFDBD5] rounded-md transition shadow-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateProduct.isPending}
              className="px-5 py-2 text-xs font-semibold text-[#242423] bg-[#F5CB5C] hover:bg-[#E5B946] rounded-md transition disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {updateProduct.isPending ? 'Guardando cambios...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default EditProductModal

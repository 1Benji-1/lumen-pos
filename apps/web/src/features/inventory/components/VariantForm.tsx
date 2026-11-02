import { useState, useEffect } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useCreateProduct } from '../hooks/useProducts'
import { useSuppliers } from '../hooks/useSuppliers'
import { PRODUCT_UNITS, type ProductUnit } from '@lumen-pos/types'
import { generateInternalBarcode } from '../utils/barcodeGenerator'
import { useStoreSettings } from '../../settings/hooks/useStoreSettings'

export function VariantForm({
  storeId,
  onSuccess,
  onCancel,
}: {
  storeId: string
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const { data: categories } = useCategories(storeId)
  const { data: suppliers } = useSuppliers(storeId)
  const { settings } = useStoreSettings(storeId)
  const createProduct = useCreateProduct(storeId)

  const defaultUnit = (settings?.default_product_unit as ProductUnit) || 'unit'
  const currency = settings?.currency_symbol || 'Bs'
  const targetMargin = settings?.target_profit_margin != null ? Number(settings.target_profit_margin) : null

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [unit, setUnit] = useState<ProductUnit>(defaultUnit)
  const [imageUrl, setImageUrl] = useState('')
  const [barcode, setBarcode] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [trackBatch, setTrackBatch] = useState(false)
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Sincronizar unidad inicial si carga la configuración y el formulario está limpio
  useEffect(() => {
    if (settings?.default_product_unit && !name && !barcode) {
      setUnit((settings.default_product_unit as ProductUnit) || 'unit')
    }
  }, [settings?.default_product_unit, name, barcode])

  function handleGenerateBarcode() {
    const prefix = settings?.internal_barcode_prefix || '200'
    setBarcode(generateInternalBarcode(prefix))
  }

  function handleCostChange(val: string) {
    setCostPrice(val)
    const numCost = parseFloat(val)
    if (!isNaN(numCost) && numCost > 0 && targetMargin != null && targetMargin > 0) {
      const suggested = (numCost * (1 + targetMargin / 100)).toFixed(2)
      setSalePrice(suggested)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createProduct.mutateAsync({
        name: name.trim(),
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        unit,
        imageUrl: imageUrl.trim() || null,
        variantName: 'Único',
        barcode: barcode.trim() || undefined,
        costPrice: Number(costPrice) || 0,
        salePrice: Number(salePrice) || 0,
        stockQuantity: Number(stockQuantity) || 0,
        trackBatch,
        batchNumber: trackBatch ? batchNumber.trim() || null : null,
        expiryDate: trackBatch ? expiryDate || null : null,
      })
      setName('')
      setCategoryId('')
      setSupplierId('')
      setUnit(defaultUnit)
      setImageUrl('')
      setBarcode('')
      setCostPrice('')
      setSalePrice('')
      setStockQuantity('')
      setTrackBatch(false)
      setBatchNumber('')
      setExpiryDate('')
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el producto')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 text-[#242423] max-w-md bg-white border border-[#CFDBD5] p-6 rounded-xl shadow-xs"
    >
      <h2 className="text-lg font-bold text-[#242423]">Nuevo producto</h2>

      <div>
        <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
          Nombre del producto *
        </label>
        <input
          type="text"
          placeholder="Nombre del producto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
            Categoría
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
          >
            <option value="">Sin categoría</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
            Unidad de medida
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as ProductUnit)}
            className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
          Proveedor
        </label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
        >
          <option value="">Sin proveedor asignado</option>
          {suppliers?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.contact_name ? `(${s.contact_name})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
          URL de imagen (opcional)
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="url"
            placeholder="https://ejemplo.com/foto.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="flex-1 bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Vista previa"
              className="w-10 h-10 object-cover rounded border border-[#CFDBD5] bg-white"
              onError={(e) => {
                ;(e.target as HTMLElement).style.display = 'none'
              }}
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
          Código de barras
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Código de fábrica o generado"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            autoFocus
            className="flex-1 bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
          />
          <button
            type="button"
            onClick={handleGenerateBarcode}
            className="px-3 py-2 bg-white hover:bg-[#E8EDDF] text-xs font-medium text-[#242423] border border-[#CFDBD5] rounded-md transition whitespace-nowrap shadow-xs"
          >
            Generar propio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
            Precio de costo ({currency})
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={costPrice}
            onChange={(e) => handleCostChange(e.target.value)}
            className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider">
              Precio venta ({currency}) *
            </label>
            {targetMargin != null && targetMargin > 0 && (
              <span className="text-[10px] text-[#588157] font-semibold">
                +{targetMargin}%
              </span>
            )}
          </div>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            required
            className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
          Stock inicial ({unit})
        </label>
        <input
          type="number"
          step={unit === 'unit' ? '1' : '0.001'}
          placeholder="0"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
        />
      </div>

      {/* Control opcional de lote y fecha de vencimiento */}
      <div className="pt-2 border-t border-[#CFDBD5]">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#242423]">
          <input
            type="checkbox"
            checked={trackBatch}
            onChange={(e) => setTrackBatch(e.target.checked)}
            className="rounded border-[#CFDBD5] text-[#242423]"
          />
          Activar control de lote y fecha de caducidad
        </label>

        {trackBatch && (
          <div className="grid grid-cols-2 gap-3 mt-3 bg-[#E8EDDF]/30 p-3 rounded-lg border border-[#CFDBD5]">
            <div>
              <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                Número de lote
              </label>
              <input
                type="text"
                placeholder="Ej. LOT-2026-A"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full bg-white border border-[#CFDBD5] rounded-md px-3 py-1.5 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                Fecha de caducidad
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-white border border-[#CFDBD5] rounded-md px-3 py-1.5 text-sm text-[#242423] focus:outline-none focus:border-[#242423]"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[#BC4749] text-xs">{error}</p>}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white hover:bg-[#E8EDDF] font-medium text-[#242423] rounded-md py-2 border border-[#CFDBD5] transition shadow-xs"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={createProduct.isPending}
          className={`${onCancel ? 'flex-1' : 'w-full'} bg-[#F5CB5C] hover:bg-[#E5B946] font-semibold text-[#242423] rounded-md py-2 transition shadow-xs disabled:opacity-50`}
        >
          {createProduct.isPending ? 'Guardando...' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}
export default VariantForm
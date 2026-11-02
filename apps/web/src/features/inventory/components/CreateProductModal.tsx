import { useState, useEffect } from 'react'
import { useCategories, useCreateCategory } from '../hooks/useCategories'
import { useSuppliers } from '../hooks/useSuppliers'
import { useCreateProduct } from '../hooks/useProducts'
import { generateInternalBarcode } from '../utils/barcodeGenerator'
import { useRetailSubrubro } from '../../../shared/hooks/useRetailSubrubro'
import { PRODUCT_UNITS, type ProductUnit } from '@lumen-pos/types'
import { useStoreSettings } from '../../settings/hooks/useStoreSettings'

interface CreateProductModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  initialBarcode?: string
}

export function CreateProductModal({
  isOpen,
  onClose,
  storeId,
  initialBarcode = '',
}: CreateProductModalProps) {
  const { config } = useRetailSubrubro()
  const { data: categories } = useCategories(storeId)
  const { data: suppliers } = useSuppliers(storeId)
  const { settings } = useStoreSettings(storeId)
  const createProduct = useCreateProduct(storeId)
  const createCategory = useCreateCategory(storeId)

  const defaultUnit = (settings?.default_product_unit as ProductUnit) || 'unit'
  const currency = settings?.currency_symbol || 'Bs'
  const targetMargin = settings?.target_profit_margin != null ? Number(settings.target_profit_margin) : null

  // Datos generales
  const [productName, setProductName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [variantName, setVariantName] = useState('Único')
  const [supplierId, setSupplierId] = useState('')
  const [description, setDescription] = useState('')

  // Códigos
  const [barcode, setBarcode] = useState(initialBarcode)
  const [sku, setSku] = useState('')

  // Precios e inventario
  const [salePrice, setSalePrice] = useState('')
  const [costPrice, setCostPrice] = useState('0')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [unit, setUnit] = useState<ProductUnit>(defaultUnit)
  const [lowStockThreshold, setLowStockThreshold] = useState('5')

  // Sincronizar unidad predeterminada cuando abre el modal
  useEffect(() => {
    if (settings?.default_product_unit && isOpen && !productName) {
      setUnit((settings.default_product_unit as ProductUnit) || 'unit')
    }
  }, [settings?.default_product_unit, isOpen])

  // Lotes y vencimiento
  const [trackBatch, setTrackBatch] = useState(false)
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  // Creación rápida de categoría al vuelo
  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [quickCategoryName, setQuickCategoryName] = useState('')
  const [quickCategoryError, setQuickCategoryError] = useState<string | null>(null)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

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

  async function handleQuickCategorySubmit(e: React.FormEvent) {
    e.preventDefault()
    setQuickCategoryError(null)
    const trimmed = quickCategoryName.trim()
    if (!trimmed) {
      setQuickCategoryError('El nombre no puede estar vacío.')
      return
    }

    try {
      const newCat = await createCategory.mutateAsync(trimmed)
      setQuickCategoryName('')
      setShowQuickCategory(false)
      if (newCat?.id) {
        setCategoryId(newCat.id)
      }
    } catch (err: any) {
      setQuickCategoryError(err.message || 'Error al crear categoría')
    }
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

    try {
      await createProduct.mutateAsync({
        name: productName.trim(),
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        unit,
        variantName: variantName.trim() || 'Único',
        barcode: barcode.trim() || undefined,
        sku: sku.trim() || undefined,
        description: description.trim() || undefined,
        costPrice: numCostPrice,
        salePrice: numSalePrice,
        stockQuantity: numStock,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        trackBatch,
        batchNumber: trackBatch ? batchNumber.trim() || null : null,
        expiryDate: trackBatch && expiryDate ? expiryDate : null,
      })

      // Resetear estado
      setProductName('')
      setCategoryId('')
      setVariantName('Único')
      setSupplierId('')
      setDescription('')
      setBarcode('')
      setSku('')
      setSalePrice('')
      setCostPrice('0')
      setStockQuantity('0')
      setUnit('unit')
      setLowStockThreshold('5')
      setTrackBatch(false)
      setBatchNumber('')
      setExpiryDate('')

      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al registrar el producto.')
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
            <h2 className="text-lg font-bold text-[#242423] tracking-tight">Nuevo producto</h2>
            <p className="text-xs text-[#5A5D5A] mt-0.5">
              Registra un nuevo artículo en el catálogo comercial e inventario.
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

          {/* Sección 1: Información General */}
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
                  placeholder="Ej. Coca-Cola 2L, Arroz Grano de Oro..."
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition placeholder:text-[#5A5D5A]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#5A5D5A]">
                    Categoría
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCategory(!showQuickCategory)}
                    className="text-xs text-[#242423] font-medium hover:underline"
                  >
                    {showQuickCategory ? 'Cerrar' : '+ Nueva categoría'}
                  </button>
                </div>

                {showQuickCategory ? (
                  <div className="p-2.5 rounded-lg bg-[#E8EDDF]/30 border border-[#CFDBD5] space-y-2">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Nombre de nueva categoría"
                        value={quickCategoryName}
                        onChange={(e) => setQuickCategoryName(e.target.value)}
                        className="flex-1 bg-white border border-[#CFDBD5] rounded-md px-2.5 py-1 text-xs text-[#242423] focus:outline-none focus:border-[#242423]"
                      />
                      <button
                        type="button"
                        onClick={handleQuickCategorySubmit}
                        disabled={createCategory.isPending || !quickCategoryName.trim()}
                        className="px-2.5 py-1 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] rounded-md text-xs font-semibold disabled:opacity-50 shadow-xs"
                      >
                        Crear
                      </button>
                    </div>
                    {quickCategoryError && (
                      <p className="text-xs text-[#BC4749]">{quickCategoryError}</p>
                    )}
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Variante / Presentación
                </label>
                <input
                  type="text"
                  placeholder="Ej. Único, Talla L, 500ml..."
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition placeholder:text-[#5A5D5A]"
                />

                {config.hasSizeMatrix && (
                  <div className="mt-2 space-y-1.5 bg-[#E8EDDF]/30 p-2 rounded-lg border border-[#CFDBD5]">
                    <span className="text-xs font-bold text-[#5A5D5A] uppercase tracking-wider block">
                      Atajos de tallas rápidos:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {['36', '37', '38', '39', '40', '41', '42', 'S', 'M', 'L', 'XL'].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            if (variantName === 'Único' || !variantName) {
                              setVariantName(`Talla ${size}`)
                            } else if (!variantName.includes(size)) {
                              setVariantName(`${variantName} - Talla ${size}`)
                            }
                          }}
                          className="px-2 py-0.5 rounded text-xs font-mono bg-white hover:bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] transition shadow-xs"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                placeholder="Observaciones, notas comerciales, especificaciones..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  placeholder="Escanea o escribe el código"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition placeholder:text-[#5A5D5A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  SKU (Código interno)
                </label>
                <input
                  type="text"
                  placeholder="Ej. ART-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition placeholder:text-[#5A5D5A]"
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Precios e Inventario Inicial */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#242423] border-b border-[#CFDBD5] pb-1.5">
              Precios e inventario inicial
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-[#5A5D5A]">
                    Precio de venta ({currency}) <span className="text-[#BC4749]">*</span>
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
                  min="0"
                  required
                  placeholder="0.00"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Precio de costo ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costPrice}
                  onChange={(e) => handleCostChange(e.target.value)}
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
                  {PRODUCT_UNITS.filter((u) =>
                    config.allowedUnits.length > 0
                      ? config.allowedUnits.includes(u.symbol) || config.allowedUnits.includes(u.value)
                      : true
                  ).map((u) => (
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
                  Stock inicial
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
                />
                <span className="text-xs text-[#5A5D5A] mt-1 block">
                  Si es mayor a 0, se registrará el ingreso en el historial de movimientos.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A5D5A] mb-1">
                  Umbral de alerta de stock mínimo
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
          </div>

          {/* Sección 4: Lotes y Vencimiento */}
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
                    placeholder="Ej. LOTE-2026-09"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
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

          {/* Botones de Acción */}
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
              disabled={createProduct.isPending}
              className="px-5 py-2 text-xs font-semibold text-[#242423] bg-[#F5CB5C] hover:bg-[#E5B946] rounded-md transition disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {createProduct.isPending ? 'Registrando...' : 'Registrar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default CreateProductModal

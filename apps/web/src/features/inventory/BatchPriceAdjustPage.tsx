import { useState, useMemo } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useProducts, useBatchUpdatePrices } from './hooks/useProducts'
import { useCategories } from './hooks/useCategories'
import { InventoryDrawer } from './components/InventoryDrawer'
import { InventoryNavTabs } from './components/InventoryNavTabs'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import { StickyTableWrapper } from '../../shared/components/StickyTableWrapper'

type TargetField = 'sale_price' | 'cost_price' | 'both'
type OperationType = 'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease'
type RoundingOption = 'none' | 'integer' | 'half'

export function BatchPriceAdjustPage() {
  const { storeId, loading } = useStoreId()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { data: products, isLoading, refetch } = useProducts(storeId, { includeInactive: false })
  const { data: categories } = useCategories(storeId)
  const batchUpdate = useBatchUpdatePrices(storeId)

  // Filters & selection
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set())

  // Controls
  const [target, setTarget] = useState<TargetField>('sale_price')
  const [operation, setOperation] = useState<OperationType>('percentage_increase')
  const [amount, setAmount] = useState<string>('')
  const [rounding, setRounding] = useState<RoundingOption>('none')

  // Status
  const [isApplying, setIsApplying] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Flatten active variants
  const allVariants = useMemo(() => {
    if (!products) return []
    return products.flatMap((p) =>
      p.product_variants.map((v) => ({
        variantId: v.id,
        productId: p.id,
        productName: p.name,
        variantName: v.name,
        categoryId: p.category_id,
        categoryName: p.categories?.name ?? 'Sin categoría',
        currentSalePrice: Number(v.sale_price) || 0,
        currentCostPrice: Number(v.cost_price) || 0,
      }))
    )
  }, [products])

  const filteredVariants = useMemo(() => {
    return allVariants.filter((v) => {
      if (selectedCategoryId && v.categoryId !== selectedCategoryId) return false
      if (search.trim()) {
        const term = search.toLowerCase()
        if (!v.productName.toLowerCase().includes(term) && !v.variantName.toLowerCase().includes(term)) {
          return false
        }
      }
      return true
    })
  }, [allVariants, selectedCategoryId, search])

  // Select all visible / clear
  function handleSelectAll() {
    const next = new Set(selectedVariantIds)
    filteredVariants.forEach((v) => next.add(v.variantId))
    setSelectedVariantIds(next)
  }

  function handleDeselectAll() {
    const next = new Set(selectedVariantIds)
    filteredVariants.forEach((v) => next.delete(v.variantId))
    setSelectedVariantIds(next)
  }

  function toggleVariantSelection(id: string) {
    const next = new Set(selectedVariantIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedVariantIds(next)
  }

  // Calculate new price based on rule
  function calculateNewPrice(currentPrice: number): number {
    const val = Number(amount) || 0
    if (val === 0) return currentPrice

    let calculated = currentPrice
    switch (operation) {
      case 'percentage_increase':
        calculated = currentPrice * (1 + val / 100)
        break
      case 'percentage_decrease':
        calculated = Math.max(0, currentPrice * (1 - val / 100))
        break
      case 'fixed_increase':
        calculated = currentPrice + val
        break
      case 'fixed_decrease':
        calculated = Math.max(0, currentPrice - val)
        break
    }

    // Apply rounding
    switch (rounding) {
      case 'integer':
        calculated = Math.ceil(calculated)
        break
      case 'half':
        calculated = Math.ceil(calculated * 2) / 2
        break
      case 'none':
      default:
        calculated = Math.round(calculated * 100) / 100
        break
    }

    return calculated
  }

  async function handleApplyChanges() {
    const selectedList = filteredVariants.filter((v) => selectedVariantIds.has(v.variantId))
    if (selectedList.length === 0) {
      alert('Seleccione al menos un producto para actualizar.')
      return
    }

    const val = Number(amount) || 0
    if (val <= 0) {
      alert('Ingrese un porcentaje o monto válido mayor a 0.')
      return
    }

    const confirmMsg = `¿Está seguro de actualizar los precios de ${selectedList.length} producto(s)?`
    if (!window.confirm(confirmMsg)) return

    setIsApplying(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const updates = selectedList.map((v) => {
        const updateItem: { variantId: string; salePrice?: number; costPrice?: number } = {
          variantId: v.variantId,
        }
        if (target === 'sale_price' || target === 'both') {
          updateItem.salePrice = calculateNewPrice(v.currentSalePrice)
        }
        if (target === 'cost_price' || target === 'both') {
          updateItem.costPrice = calculateNewPrice(v.currentCostPrice)
        }
        return updateItem
      })

      await batchUpdate.mutateAsync(updates)
      setSuccessMessage(
        `Precios actualizados exitosamente en ${selectedList.length} producto(s).`
      )
      setAmount('')
      setSelectedVariantIds(new Set())
      await refetch()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar precios')
    } finally {
      setIsApplying(false)
    }
  }

  if (loading || isLoading) return <LoadingScreen message="Cargando catálogo para ajuste de precios..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>

  const hasRule = Number(amount) > 0
  const selectedCount = selectedVariantIds.size

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-inventory-view">
      <InventoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">
            Ajuste masivo de precios
          </h1>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Actualice los precios de venta o costo de múltiples productos simultáneamente por porcentaje o monto fijo.
          </p>
        </div>
      </div>

      {/* Sub-navegación de Inventario */}
      <InventoryNavTabs />

      {/* Alertas */}
      {successMessage && (
        <div className="bg-[#EFF5EE] border border-[#BBD2B8] text-[#588157] px-4 py-3 rounded-lg text-xs flex justify-between items-center shadow-xs">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="font-bold text-sm">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] px-4 py-3 rounded-lg text-xs flex justify-between items-center shadow-xs">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold text-sm">✕</button>
        </div>
      )}

      {/* Panel de configuración de la regla de precios */}
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-5 space-y-4 shadow-xs">
        <h2 className="text-xs font-bold text-[#242423] uppercase tracking-wider">
          Configuración de la regla de precio
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Precio a modificar
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as TargetField)}
              className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-xs text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
            >
              <option value="sale_price">Precio de venta</option>
              <option value="cost_price">Precio de costo</option>
              <option value="both">Ambos (Venta y Costo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Operación
            </label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value as OperationType)}
              className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-xs text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
            >
              <option value="percentage_increase">Aumento porcentual (+%)</option>
              <option value="percentage_decrease">Descuento porcentual (-%)</option>
              <option value="fixed_increase">Aumento fijo (+Bs)</option>
              <option value="fixed_decrease">Descuento fijo (-Bs)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              {operation.startsWith('percentage') ? 'Porcentaje (%)' : 'Monto (Bs)'}
            </label>
            <input
              type="number"
              step="any"
              placeholder={operation.startsWith('percentage') ? 'Ej. 10' : 'Ej. 5.00'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-xs text-[#242423] tabular-nums focus:outline-none focus:border-[#242423] focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Redondeo de precio
            </label>
            <select
              value={rounding}
              onChange={(e) => setRounding(e.target.value as RoundingOption)}
              className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-2 text-xs text-[#242423] focus:outline-none focus:border-[#242423] focus:bg-white transition"
            >
              <option value="none">Sin redondeo (2 decimales exactos)</option>
              <option value="integer">Al entero superior (ej. 12.30 → 13.00)</option>
              <option value="half">A 0.50 más cercano (ej. 12.30 → 12.50)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filtros de la tabla */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <input
            type="text"
            placeholder="Filtrar por nombre de producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3.5 py-2 text-xs text-[#242423] placeholder-[#5A5D5A] focus:outline-none focus:border-[#242423] focus:bg-white transition"
          />

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="bg-white border border-[#CFDBD5] rounded-md px-3 py-2 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition"
          >
            <option value="">Todas las categorías</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs bg-white hover:bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] px-3 py-2 rounded-md transition shadow-xs font-medium"
          >
            Seleccionar visibles
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-xs text-[#5A5D5A] hover:text-[#242423] px-2 py-2 transition"
          >
            Deseleccionar
          </button>
        </div>
      </div>

      {/* Tabla con previsualización */}
      {isLoading ? (
        <div className="text-[#5A5D5A] py-8 text-center text-sm">Cargando productos...</div>
      ) : filteredVariants.length === 0 ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center shadow-xs">
          <p className="text-[#5A5D5A] text-sm">No se encontraron productos coincidentes.</p>
        </div>
      ) : (
        <StickyTableWrapper>
          <table className="w-full text-left text-sm">
            <thead className="table-sticky-header text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <span className="sr-only">Selección</span>
                </th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Precio Venta Actual</th>
                <th className="py-3 px-4 text-right">Nuevo Precio Venta</th>
                <th className="py-3 px-4 text-right">Precio Costo Actual</th>
                <th className="py-3 px-4 text-right">Nuevo Precio Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBD5]/40 text-xs">
              {filteredVariants.map((v) => {
                const isSelected = selectedVariantIds.has(v.variantId)
                const newSale =
                  target === 'sale_price' || target === 'both'
                    ? calculateNewPrice(v.currentSalePrice)
                    : v.currentSalePrice
                const newCost =
                  target === 'cost_price' || target === 'both'
                    ? calculateNewPrice(v.currentCostPrice)
                    : v.currentCostPrice

                const diffSale = newSale - v.currentSalePrice
                const diffCost = newCost - v.currentCostPrice

                return (
                  <tr
                    key={v.variantId}
                    className={`hover:bg-[#E8EDDF]/20 transition cursor-pointer ${
                      isSelected ? 'bg-[#F5CB5C]/15' : ''
                    }`}
                    onClick={() => toggleVariantSelection(v.variantId)}
                  >
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleVariantSelection(v.variantId)}
                        className="rounded border-[#CFDBD5] text-[#242423] focus:ring-[#242423]"
                      />
                    </td>

                    <td className="py-3 px-4 font-medium text-[#242423]">
                      {v.productName}
                      {v.variantName !== 'Único' && (
                        <span className="text-[#5A5D5A] ml-1">({v.variantName})</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#5A5D5A]">{v.categoryName}</td>

                    <td className="py-3 px-4 text-right font-mono text-[#5A5D5A] tabular-nums">
                      Bs {v.currentSalePrice.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      {hasRule && (target === 'sale_price' || target === 'both') ? (
                        <span className={diffSale > 0 ? 'text-[#588157]' : diffSale < 0 ? 'text-[#BC4749]' : 'text-[#242423]'}>
                          Bs {newSale.toFixed(2)}{' '}
                          <span className="text-xs block font-normal">
                            ({diffSale >= 0 ? `+${diffSale.toFixed(2)}` : diffSale.toFixed(2)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#5A5D5A] font-normal">Sin cambio</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-[#5A5D5A] tabular-nums">
                      Bs {v.currentCostPrice.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      {hasRule && (target === 'cost_price' || target === 'both') ? (
                        <span className={diffCost > 0 ? 'text-[#BC4749]' : diffCost < 0 ? 'text-[#588157]' : 'text-[#242423]'}>
                          Bs {newCost.toFixed(2)}{' '}
                          <span className="text-xs block font-normal">
                            ({diffCost >= 0 ? `+${diffCost.toFixed(2)}` : diffCost.toFixed(2)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#5A5D5A] font-normal">Sin cambio</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}

      {/* Barra de confirmación flotante */}
      {selectedCount > 0 && hasRule && (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-5 flex items-center justify-between gap-4 sticky bottom-4 shadow-xl z-20">
          <div>
            <span className="text-sm font-bold text-[#242423] block">
              {selectedCount} producto{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Se aplicará {operation.includes('percentage') ? `${amount}%` : `Bs ${amount}`} sobre{' '}
              {target === 'sale_price' ? 'el precio de venta' : target === 'cost_price' ? 'el precio de costo' : 'ambos precios'}.
            </span>
          </div>

          <button
            type="button"
            onClick={handleApplyChanges}
            disabled={isApplying}
            className="bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-semibold px-6 py-2.5 rounded-md text-xs transition whitespace-nowrap disabled:opacity-50 shadow-xs"
          >
            {isApplying ? 'Actualizando precios...' : 'Aplicar cambio masivo'}
          </button>
        </div>
      )}
    </div>
  )
}
export default BatchPriceAdjustPage

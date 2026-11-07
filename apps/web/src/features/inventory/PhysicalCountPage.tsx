import { useState, useMemo } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useProducts, useAdjustVariantStock } from './hooks/useProducts'
import { InventoryDrawer } from './components/InventoryDrawer'
import { InventoryNavTabs } from './components/InventoryNavTabs'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import { StickyTableWrapper } from '../../shared/components/StickyTableWrapper'
import { useStoreSettings } from '../settings/hooks/useStoreSettings'
import { useStorePlan } from '../../shared/hooks/useStorePlan'
import { useStoreEntitlements } from '../../shared/hooks/useStoreEntitlements'

interface CountItem {
  variantId: string
  productName: string
  variantName: string
  categoryName: string
  barcode: string | null
  unit: string
  systemStock: number
  countedStock: string // string for input handling
}

export function PhysicalCountPage() {
  const { storeId, loading } = useStoreId()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { data: products, isLoading, refetch } = useProducts(storeId, { includeInactive: false })
  const { settings } = useStoreSettings(storeId)
  const { data: planData } = useStorePlan(storeId)
  const { isFeatureEnabled } = useStoreEntitlements()
  const adjustStock = useAdjustVariantStock(storeId)

  // El conteo a ciegas aplica si está habilitado en ajustes y el plan es Enterprise o tiene override
  const planCode = (planData?.plans as any)?.code
  const hasBlindCountPlan = planCode === 'enterprise' || isFeatureEnabled('physical_count_blind')
  const isBlindCount = hasBlindCountPlan && (settings?.blind_physical_count === true)

  const [counts, setCounts] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Flatten active products into count items
  const items: CountItem[] = useMemo(() => {
    if (!products) return []
    return products.flatMap((p) =>
      p.product_variants.map((v) => ({
        variantId: v.id,
        productName: p.name,
        variantName: v.name,
        categoryName: p.categories?.name ?? 'Sin categoría',
        barcode: v.barcode,
        unit: v.unit ?? 'u',
        systemStock: Number(v.stock_quantity),
        countedStock: counts[v.id] !== undefined ? counts[v.id] : '',
      }))
    )
  }, [products, counts])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const term = search.toLowerCase()
    return items.filter(
      (it) =>
        it.productName.toLowerCase().includes(term) ||
        it.variantName.toLowerCase().includes(term) ||
        it.categoryName.toLowerCase().includes(term) ||
        (it.barcode && it.barcode.toLowerCase().includes(term))
    )
  }, [items, search])

  // Items con conteo ingresado y discrepancia
  const discrepancies = useMemo(() => {
    return items.filter((it) => {
      if (it.countedStock === '') return false
      const counted = Number(it.countedStock)
      return !isNaN(counted) && counted !== it.systemStock
    })
  }, [items])

  function handleCountChange(variantId: string, val: string) {
    setCounts((prev) => ({ ...prev, [variantId]: val }))
  }

  function handleFillAllCurrent() {
    const newCounts: Record<string, string> = {}
    items.forEach((it) => {
      newCounts[it.variantId] = String(it.systemStock)
    })
    setCounts(newCounts)
  }

  function handleClearAll() {
    setCounts({})
  }

  async function handleApplyReconciliation() {
    if (discrepancies.length === 0) {
      alert('No hay discrepancias registradas para reconciliar.')
      return
    }

    const confirmMsg = `¿Está seguro de conciliar el inventario? Se aplicarán ajustes a ${discrepancies.length} productos.`
    if (!window.confirm(confirmMsg)) return

    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const reasonText = note.trim()
        ? `Reconciliación de conteo físico: ${note.trim()}`
        : 'Reconciliación de conteo físico periódico'

      for (const disc of discrepancies) {
        const newStock = Number(disc.countedStock)
        await adjustStock.mutateAsync({
          variantId: disc.variantId,
          newStock,
          type: 'physical_count',
          reason: reasonText,
        })
      }

      setSuccessMessage(`Reconciliación completada con éxito. Se actualizaron ${discrepancies.length} productos.`)
      setCounts({})
      setNote('')
      refetch()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al aplicar reconciliación')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || isLoading) return <LoadingScreen message="Cargando existencias para conteo..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-inventory-view">
      <InventoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#242423] tracking-tight">
              Conteo físico y reconciliación
            </h1>
            {isBlindCount && (
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/50 flex items-center gap-1 shadow-xs">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
                Modo Conteo a Ciegas Activo
              </span>
            )}
          </div>
          <p className="text-xs text-[#5A5D5A] mt-1">
            {isBlindCount
              ? 'El stock teórico del sistema se encuentra oculto para garantizar un conteo físico imparcial.'
              : 'Auditoría física de almacén: registre existencias reales, detecte sobrantes o faltantes y aplique el ajuste automático.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isBlindCount && (
            <button
              type="button"
              onClick={handleFillAllCurrent}
              className="px-3.5 py-2 rounded-md bg-white hover:bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5] transition-colors shadow-xs cursor-pointer"
              title="Pre-llenar el conteo con el stock que figura en el sistema"
            >
              Pre-llenar stock actual
            </button>
          )}
          {Object.keys(counts).length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[#5A5D5A] hover:text-[#BC4749] font-medium px-3 py-2 text-xs transition cursor-pointer"
            >
              Limpiar conteo
            </button>
          )}
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

      {/* Resumen de conteo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#5A5D5A] block">Total artículos a contar</span>
          <span className="text-xl font-bold text-[#242423] mt-1 block tabular-nums">{items.length}</span>
        </div>
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#5A5D5A] block">Artículos con conteo ingresado</span>
          <span className="text-xl font-bold text-[#242423] mt-1 block tabular-nums">
            {Object.keys(counts).filter((k) => counts[k] !== '').length}
          </span>
        </div>
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#5A5D5A] block">Discrepancias detectadas</span>
          <span className={`text-xl font-bold mt-1 block tabular-nums ${discrepancies.length > 0 && !isBlindCount ? 'text-[#BC4749]' : 'text-[#588157]'}`}>
            {isBlindCount ? 'Oculto (Ciego)' : discrepancies.length}
          </span>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-3.5 shadow-xs">
        <input
          type="text"
          placeholder="Filtrar por producto, categoría o código de barras..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3.5 py-2 text-xs text-[#242423] placeholder-[#5A5D5A] focus:outline-none focus:border-[#242423] focus:bg-white transition"
        />
      </div>

      {/* Tabla de Conteo */}
      {isLoading ? (
        <div className="text-[#5A5D5A] py-8 text-center text-sm">Cargando inventario...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center shadow-xs">
          <p className="text-[#5A5D5A] text-sm">No se encontraron productos para contar.</p>
        </div>
      ) : (
        <StickyTableWrapper>
          <table className="w-full text-left text-sm">
            <thead className="table-sticky-header text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4 text-right">Stock Sistema</th>
                <th className="py-3 px-4 text-center w-36">Conteo Físico</th>
                <th className="py-3 px-4 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBD5]/40 text-xs">
              {filteredItems.map((item) => {
                const hasCount = item.countedStock !== ''
                const countedNum = Number(item.countedStock)
                const diff = hasCount ? countedNum - item.systemStock : 0

                return (
                  <tr key={item.variantId} className="hover:bg-[#E8EDDF]/20 transition">
                    <td className="py-3 px-4 font-medium text-[#242423]">
                      {item.productName}
                      {item.variantName !== 'Único' && (
                        <span className="text-[#5A5D5A] ml-1">({item.variantName})</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#5A5D5A]">{item.categoryName}</td>

                    <td className="py-3 px-4 font-mono text-[#5A5D5A] tabular-nums">{item.barcode || '—'}</td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#242423] tabular-nums">
                      {isBlindCount ? (
                        <span className="text-[#5A5D5A] font-normal tracking-widest select-none" title="Oculto por conteo a ciegas">••••</span>
                      ) : (
                        <>
                          {item.systemStock} <span className="text-[#5A5D5A] font-normal">{item.unit}</span>
                        </>
                      )}
                    </td>

                    <td className="py-2 px-4 text-center">
                      <input
                        type="number"
                        step="any"
                        placeholder="—"
                        value={item.countedStock}
                        onChange={(e) => handleCountChange(item.variantId, e.target.value)}
                        className={`w-28 text-center rounded-md px-2 py-1 text-xs font-bold tabular-nums border focus:outline-none transition ${
                          !isBlindCount && hasCount && diff !== 0
                            ? diff > 0
                              ? 'border-[#588157] text-[#588157] bg-[#EFF5EE]'
                              : 'border-[#BC4749] text-[#BC4749] bg-[#FDF0ED]'
                            : 'border-[#CFDBD5] text-[#242423] bg-white'
                        }`}
                      />
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                      {isBlindCount ? (
                        <span className="text-[#5A5D5A] font-normal tracking-widest select-none" title="Oculto por conteo a ciegas">••••</span>
                      ) : !hasCount ? (
                        <span className="text-[#5A5D5A] font-normal">Sin contar</span>
                      ) : diff === 0 ? (
                        <span className="text-[#5A5D5A] font-normal">Exacto (0)</span>
                      ) : diff > 0 ? (
                        <span className="text-[#588157]">+{diff} {item.unit} (Sobrante)</span>
                      ) : (
                        <span className="text-[#BC4749]">{diff} {item.unit} (Faltante)</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}

      {/* Barra de acción para reconciliar */}
      {discrepancies.length > 0 && (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-xl z-20">
          <div className="flex-1 w-full">
            <span className="text-sm font-bold text-[#242423] block">
              {discrepancies.length} discrepancia{discrepancies.length !== 1 ? 's' : ''} lista{discrepancies.length !== 1 ? 's' : ''} para reconciliar
            </span>
            <input
              type="text"
              placeholder="Nota opcional (ej. Auditoría fin de mes, rotura de inventario)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5 w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3 py-1.5 text-xs text-[#242423] placeholder-[#5A5D5A] focus:outline-none focus:border-[#242423] focus:bg-white transition"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyReconciliation}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-semibold px-5 py-2.5 rounded-md text-xs transition whitespace-nowrap disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              'Aplicando ajustes...'
            ) : (
              <>
                <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Aplicar reconciliación</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
export default PhysicalCountPage

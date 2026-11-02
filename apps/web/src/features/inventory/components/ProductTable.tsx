import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useProducts,
  useToggleProductActive,
  useAssignInternalBarcode,
} from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { StockAlertBadge } from './StockAlertBadge'
import { ExpiryAlertBadge } from './ExpiryAlertBadge'
import { BarcodeLabelModal, type LabelProductData } from './BarcodeLabelModal'
import { EditProductModal } from './EditProductModal'
import { QuickAdjustmentModal } from './QuickAdjustmentModal'
import { generateInternalBarcode } from '../utils/barcodeGenerator'
import { PRODUCT_UNITS } from '@lumen-pos/types'
import { useStorePlan } from '../../../shared/hooks/useStorePlan'
import { useCurrentUserRole } from '../../../shared/hooks/useCurrentUserRole'
import { StickyTableWrapper } from '../../../shared/components/StickyTableWrapper'

type ActiveFilter = 'active' | 'inactive' | 'all' | 'low_stock'

function formatQuantity(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0'
  const rounded = Math.round((Number(val) + Number.EPSILON) * 100) / 100
  if (Number.isInteger(rounded)) {
    return rounded.toLocaleString('es-BO')
  }
  return rounded.toLocaleString('es-BO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
}

export function ProductTable({ storeId }: { storeId: string }) {
  const { hasPermission, isAdminOrOwner } = useCurrentUserRole()
  const canManageInventory = hasPermission('inventory:manage')

  const [searchParams, setSearchParams] = useSearchParams()
  const filterQuery = searchParams.get('filter')
  const initialFilter: ActiveFilter = filterQuery === 'low_stock' ? 'low_stock' : 'active'
  const [filter, setFilter] = useState<ActiveFilter>(initialFilter)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [editingItem, setEditingItem] = useState<{ product: any; variant: any } | null>(null)
  const [adjustingVariantId, setAdjustingVariantId] = useState<string | null>(null)

  const { data: categories } = useCategories(storeId)
  const { data: storePlan } = useStorePlan(storeId)
  const planFeatures = ((storePlan?.plans as any)?.features as Record<string, any> | undefined) || {}
  const overrides = (storePlan?.feature_overrides as Record<string, any> | null) || {}
  const effectiveFeatures = { ...planFeatures, ...overrides }
  const allowBarcodeLabels = effectiveFeatures['barcode_labels'] === true

  useEffect(() => {
    const q = searchParams.get('filter')
    if (q === 'low_stock') {
      setFilter('low_stock')
    }
  }, [searchParams])

  const { data: products, isLoading } = useProducts(storeId, {
    includeInactive: filter === 'inactive' || filter === 'all',
  })
  const toggleActive = useToggleProductActive(storeId)
  const assignBarcode = useAssignInternalBarcode(storeId)

  const [labelModalData, setLabelModalData] = useState<LabelProductData | null>(null)

  function handlePrintLabel(productName: string, variant: any) {
    if (!allowBarcodeLabels) {
      alert('La generación e impresión de etiquetas con código de barras está disponible a partir del Plan Pro.')
      return
    }
    setLabelModalData({
      productName,
      variantName: variant.name,
      salePrice: variant.sale_price,
      barcode: variant.barcode,
      batchNumber: variant.batch_number,
      expiryDate: variant.expiry_date,
    })
  }

  async function handleAssignBarcode(variantId: string) {
    const newBarcode = generateInternalBarcode()
    await assignBarcode.mutateAsync({ variantId, barcode: newBarcode })
  }

  async function handleToggleStatus(productId: string, currentActive: boolean) {
    const actionText = currentActive ? 'desactivar' : 'reactivar'
    if (window.confirm(`¿Está seguro de que desea ${actionText} este producto?`)) {
      await toggleActive.mutateAsync({ productId, isActive: !currentActive })
    }
  }

  const lowStockCount = useMemo(() => {
    return (products ?? []).filter((p) => {
      if (!p.is_active) return false
      const variants = (p as any).product_variants ?? []
      return variants.some(
        (v: any) => Number(v.stock_quantity ?? 0) <= Number(v.low_stock_threshold ?? 5)
      )
    }).length
  }, [products])

  // Filtrar según el tab seleccionado, categoría y texto de búsqueda
  const filteredProducts = useMemo(() => {
    return (products ?? []).filter((p) => {
      // 1. Filtrar por estado
      if (filter === 'active' && !p.is_active) return false
      if (filter === 'inactive' && p.is_active) return false
      if (filter === 'low_stock') {
        const variants = (p as any).product_variants ?? []
        const hasLowStock = variants.some(
          (v: any) => Number(v.stock_quantity ?? 0) <= Number(v.low_stock_threshold ?? 5)
        )
        if (!p.is_active || !hasLowStock) return false
      }

      // 2. Filtrar por categoría
      if (selectedCategoryId !== 'all') {
        if (p.category_id !== selectedCategoryId) return false
      }

      // 3. Filtrar por texto de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const matchProductName = p.name?.toLowerCase().includes(term)
        const matchCategory = p.categories?.name?.toLowerCase().includes(term)
        const variants = (p as any).product_variants ?? []
        const matchVariant = variants.some((v: any) => {
          return (
            v.name?.toLowerCase().includes(term) ||
            v.barcode?.toLowerCase().includes(term) ||
            v.sku?.toLowerCase().includes(term) ||
            v.batch_number?.toLowerCase().includes(term) ||
            v.suppliers?.name?.toLowerCase().includes(term)
          )
        })

        if (!matchProductName && !matchCategory && !matchVariant) {
          return false
        }
      }

      return true
    })
  }, [products, filter, selectedCategoryId, searchTerm])

  const hasActiveFilters =
    searchTerm.trim() !== '' || selectedCategoryId !== 'all' || filter !== 'active'

  function handleResetFilters() {
    setSearchTerm('')
    setSelectedCategoryId('all')
    setFilter('active')
    setSearchParams({})
  }

  const selectedCategoryName = useMemo(() => {
    if (selectedCategoryId === 'all' || !categories) return null
    return categories.find((c) => c.id === selectedCategoryId)?.name ?? null
  }, [selectedCategoryId, categories])

  if (isLoading) return <p className="text-[#5A5D5A] py-8 text-center text-sm">Cargando productos...</p>

  return (
    <>
      {/* Barra de Filtros y Búsqueda Unificada */}
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs space-y-3">
        {/* Fila principal: Grid de 12 columnas con altura uniforme (h-10) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* 1. Buscador */}
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A5D5A]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              aria-label="Buscar productos en el catálogo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por producto, código, SKU o lote..."
              className="w-full h-10 bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-lg pl-9 pr-8 text-xs text-[#242423] placeholder-[#5A5D5A] focus:outline-none focus:border-[#242423] focus:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#5A5D5A] hover:text-[#242423] cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 2. Filtro por Categoría */}
          <div className="lg:col-span-4">
            <label htmlFor="category-filter-select" className="sr-only">Filtrar por categoría</label>
            <select
              id="category-filter-select"
              aria-label="Filtrar por categoría"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-10 bg-white border border-[#CFDBD5] rounded-lg px-3 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer font-medium"
            >
              <option value="all">Categoría: Todas las categorías</option>
              {(categories ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  Categoría: {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filtro por Estado */}
          <div className="lg:col-span-3">
            <label htmlFor="status-filter-select" className="sr-only">Filtrar por estado</label>
            <select
              id="status-filter-select"
              aria-label="Filtrar por estado"
              value={filter}
              onChange={(e) => {
                const val = e.target.value as ActiveFilter
                setFilter(val)
                if (val === 'low_stock') setSearchParams({ filter: 'low_stock' })
                else setSearchParams({})
              }}
              className="w-full h-10 bg-white border border-[#CFDBD5] rounded-lg px-3 text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer font-medium"
            >
              <option value="active">Estado: Solo activos</option>
              <option value="low_stock">
                Estado: Stock bajo {lowStockCount > 0 ? `(${lowStockCount})` : ''}
              </option>
              <option value="inactive">Estado: Solo inactivos</option>
              <option value="all">Estado: Todos los estados</option>
            </select>
          </div>
        </div>

        {/* Fila secundaria: Resumen de productos y etiquetas de filtros activos */}
        <div className="pt-2.5 border-t border-[#CFDBD5]/40 flex items-center justify-between gap-3 flex-wrap text-xs text-[#5A5D5A]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-[#242423] bg-[#E8EDDF] px-2 py-0.5 rounded border border-[#CFDBD5]">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
            </span>

            {/* Chips de filtros activos */}
            {hasActiveFilters && (
              <>
                <span className="text-[11px] text-[#5A5D5A] ml-1">Filtros aplicados:</span>

                {selectedCategoryId !== 'all' && selectedCategoryName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                    <span>Cat: {selectedCategoryName}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId('all')}
                      aria-label="Quitar filtro de categoría"
                      className="hover:text-[#BC4749] cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}

                {filter !== 'active' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                    <span>
                      {filter === 'low_stock'
                        ? 'Stock bajo'
                        : filter === 'inactive'
                        ? 'Inactivos'
                        : 'Todos los estados'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilter('active')
                        setSearchParams({})
                      }}
                      aria-label="Restablecer filtro a activos"
                      className="hover:text-[#BC4749] cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}

                {searchTerm.trim() && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5]">
                    <span>Búsqueda: "{searchTerm}"</span>
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      aria-label="Quitar filtro de búsqueda"
                      className="hover:text-[#BC4749] cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#BC4749] hover:underline cursor-pointer"
            >
              Restablecer todo
            </button>
          )}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center mt-4 shadow-xs space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E8EDDF] flex items-center justify-center text-[#5A5D5A]">
            <svg className="w-6 h-6 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#242423]">No se encontraron productos</h3>
            <p className="text-[#5A5D5A] text-xs max-w-md mx-auto mt-1">
              {searchTerm || selectedCategoryId !== 'all'
                ? 'Ningún producto coincide con los filtros o término de búsqueda especificados.'
                : filter === 'inactive'
                ? 'No hay productos inactivos en el catálogo.'
                : filter === 'low_stock'
                ? 'No se encontraron productos con stock bajo o agotado en este momento.'
                : 'No se encontraron productos registrados en el catálogo.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#242423] underline hover:text-[#5A5D5A] cursor-pointer"
            >
              Restablecer todos los filtros
            </button>
          )}
        </div>
      ) : (
        <StickyTableWrapper className="mt-4">
          <table className="w-full min-w-[1100px] border-collapse text-[#242423] text-left text-sm">
            <thead className="table-sticky-header bg-[#F7F9F6] text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider border-b border-[#CFDBD5]">
              <tr className="bg-[#F7F9F6]">
                <th scope="col" className="py-3 px-4 bg-[#F7F9F6] border-b border-[#CFDBD5] whitespace-nowrap">Producto</th>
                <th scope="col" className="py-3 px-4 bg-[#F7F9F6] border-b border-[#CFDBD5] whitespace-nowrap">Categoría</th>
                <th scope="col" className="py-3 px-4 bg-[#F7F9F6] border-b border-[#CFDBD5] whitespace-nowrap">Proveedor</th>
                <th scope="col" className="py-3 px-4 bg-[#F7F9F6] border-b border-[#CFDBD5] whitespace-nowrap">Código de barras</th>
                <th scope="col" className="py-3 px-4 bg-[#F7F9F6] border-b border-[#CFDBD5] whitespace-nowrap">Precio</th>
                <th scope="col" className="py-3 px-4 bg-[#F7F9F6] border-b border-[#CFDBD5] whitespace-nowrap">Stock</th>
                <th scope="col" className="py-3 px-4 bg-[#F7F9F6] border-b border-[#CFDBD5] whitespace-nowrap">Lote / Vencimiento</th>
                <th scope="col" className="py-3 px-4 text-center bg-[#F7F9F6] border-b border-[#CFDBD5] whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredProducts.map((product) =>
                product.product_variants.map((variant: any) => {
                  const unitObj = PRODUCT_UNITS.find((u) => u.value === variant.unit)
                  const unitSymbol = unitObj ? unitObj.symbol : 'u'

                  return (
                    <tr
                      key={variant.id}
                      className={`hover:bg-[#E8EDDF]/20 transition-colors ${
                        !product.is_active ? 'opacity-60 bg-[#E5E5E5]/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 border-b border-[#CFDBD5]/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#242423]">{product.name}</span>
                            {!product.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4] shrink-0">
                                Inactivo
                              </span>
                            )}
                          </div>
                          {variant.name && variant.name !== 'Único' && (
                            <span className="text-xs text-[#5A5D5A] block mt-0.5">{variant.name}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#5A5D5A] text-xs font-medium border-b border-[#CFDBD5]/60 whitespace-nowrap">
                        {product.categories?.name ?? '—'}
                      </td>

                      <td className="py-3 px-4 text-[#5A5D5A] text-xs border-b border-[#CFDBD5]/60 whitespace-nowrap">
                        {variant.suppliers?.name ?? '—'}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-[#5A5D5A] border-b border-[#CFDBD5]/60 whitespace-nowrap">
                        {variant.barcode ? (
                          <span>{variant.barcode}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignBarcode(variant.id)}
                            disabled={assignBarcode.isPending}
                            className="text-[#242423] hover:text-[#8A6D14] underline text-xs font-medium disabled:opacity-50 cursor-pointer"
                          >
                            Generar código
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 border-b border-[#CFDBD5]/60 whitespace-nowrap">
                        <div className="font-bold text-[#242423] tabular-nums font-mono">
                          Bs {Number(variant.sale_price).toFixed(2)}
                        </div>
                        {isAdminOrOwner && Number(variant.cost_price) > 0 && (
                          <div className="text-[11px] text-[#5A5D5A] tabular-nums font-mono">
                            Costo: Bs {Number(variant.cost_price).toFixed(2)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 border-b border-[#CFDBD5]/60 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold tabular-nums font-mono ${
                              Number(variant.stock_quantity) < 0
                                ? 'text-[#BC4749]'
                                : 'text-[#242423]'
                            }`}
                          >
                            {formatQuantity(Number(variant.stock_quantity))}{' '}
                            <span className="text-xs text-[#5A5D5A] font-normal font-sans">{unitSymbol}</span>
                          </span>
                          <StockAlertBadge
                            quantity={Number(variant.stock_quantity)}
                            threshold={Number(variant.low_stock_threshold)}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 border-b border-[#CFDBD5]/60 whitespace-nowrap">
                        {variant.track_batch || variant.batch_number || variant.expiry_date ? (
                          <div className="flex flex-col gap-1">
                            {variant.batch_number && (
                              <span className="text-xs text-[#5A5D5A] font-mono">
                                Lote: {variant.batch_number}
                              </span>
                            )}
                            <ExpiryAlertBadge expiryDate={variant.expiry_date} />
                          </div>
                        ) : (
                          <span className="text-[#5A5D5A] text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center space-x-1.5 whitespace-nowrap border-b border-[#CFDBD5]/60">
                        {/* Botón rápido para ajustar stock físico del producto */}
                        {canManageInventory && (
                          <button
                            type="button"
                            onClick={() => setAdjustingVariantId(variant.id)}
                            className="text-xs text-[#242423] hover:text-[#242423] bg-[#E8EDDF]/40 hover:bg-[#E8EDDF] px-2.5 py-1 rounded-md transition-all duration-150 active:scale-95 border border-[#CFDBD5] shadow-2xs font-medium cursor-pointer"
                            title="Ajustar existencias físicas de este producto"
                          >
                            Ajustar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingItem({ product, variant })}
                          className="text-xs text-[#242423] hover:text-[#242423] bg-white hover:bg-[#E8EDDF]/50 px-2.5 py-1 rounded-md transition-all duration-150 active:scale-95 border border-[#CFDBD5] shadow-2xs font-medium cursor-pointer"
                          title="Editar producto, precios o detalles"
                        >
                          Editar
                        </button>

                        {variant.barcode && (
                          <button
                            type="button"
                            onClick={() => handlePrintLabel(product.name, variant)}
                            className="text-xs text-[#242423] hover:text-[#242423] bg-white hover:bg-[#E8EDDF]/50 px-2.5 py-1 rounded-md transition-all duration-150 active:scale-95 border border-[#CFDBD5] shadow-2xs font-medium cursor-pointer"
                            title="Imprimir etiqueta con código de barras"
                          >
                            Etiqueta
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(product.id, product.is_active)}
                          disabled={toggleActive.isPending}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-all duration-150 active:scale-95 font-medium cursor-pointer ${
                            product.is_active
                              ? 'text-[#8A6D14] border-[#F5CB5C]/60 bg-[#FEF9E7] hover:bg-[#F5CB5C]/20'
                              : 'text-[#588157] border-[#BBD2B8] bg-[#EFF5EE] hover:bg-[#BBD2B8]/30'
                          }`}
                          title={
                            product.is_active
                              ? 'Desactivar producto (lo oculta del POS sin borrar historial)'
                              : 'Reactivar producto en catálogo'
                          }
                        >
                          {product.is_active ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}

      {/* Modal de impresión de etiquetas */}
      {labelModalData && (
        <BarcodeLabelModal
          data={labelModalData}
          onClose={() => setLabelModalData(null)}
        />
      )}

      {/* Modal de edición de producto */}
      {editingItem && (
        <EditProductModal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          storeId={storeId}
          product={editingItem.product}
          variant={editingItem.variant}
        />
      )}

      {/* Modal de ajuste rápido de existencias directamente desde la tabla */}
      {adjustingVariantId && (
        <QuickAdjustmentModal
          storeId={storeId}
          initialVariantId={adjustingVariantId}
          onClose={() => setAdjustingVariantId(null)}
        />
      )}
    </>
  )
}

export default ProductTable
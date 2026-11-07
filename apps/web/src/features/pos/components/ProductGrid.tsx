import { useState, useMemo } from 'react'
import { useProducts } from '../../inventory/hooks/useProducts'
import { useCategories } from '../../inventory/hooks/useCategories'
import type { CartLine } from '../hooks/useCart'
import { PRODUCT_UNITS } from '@lumen-pos/types'
import { useStoreSettings } from '../../settings/hooks/useStoreSettings'

export function ProductGrid({
  storeId,
  onAddItem,
}: {
  storeId: string
  onAddItem: (item: Omit<CartLine, 'quantity'>) => void
}) {
  const { data: products, isLoading: productsLoading } = useProducts(storeId, { includeInactive: false })
  const { data: categories } = useCategories(storeId)
  const { settings } = useStoreSettings(storeId)
  const currency = settings?.currency_symbol || 'Bs'

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Filtrado predictivo por categoría y término de búsqueda (nombre, SKU, código de barras)
  const filteredProducts = useMemo(() => {
    if (!products) return []
    const query = searchQuery.trim().toLowerCase()

    return products.filter((product) => {
      // 1. Filtro por categoría seleccionada
      if (selectedCategoryId && product.category_id !== selectedCategoryId) {
        return false
      }

      // 2. Si no hay término de búsqueda, incluir todos los de la categoría
      if (!query) return true

      // 3. Coincidencia predictiva en nombre del producto
      if (product.name.toLowerCase().includes(query)) return true

      // 4. Coincidencia en variantes (nombre, SKU o código de barras)
      return product.product_variants.some((v: any) =>
        (v.name && v.name.toLowerCase().includes(query)) ||
        (v.sku && v.sku.toLowerCase().includes(query)) ||
        (v.barcode && v.barcode.toLowerCase().includes(query))
      )
    })
  }, [products, selectedCategoryId, searchQuery])

  // Desglose de variantes visualizables
  const displayItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return filteredProducts.flatMap((product) => {
      const activeVariants = product.product_variants.filter((v: any) => v.is_active)

      // Si hay búsqueda activa por SKU/código, priorizar la variante coincidente
      if (query) {
        const matchingVariants = activeVariants.filter((v: any) =>
          (v.name && v.name.toLowerCase().includes(query)) ||
          (v.sku && v.sku.toLowerCase().includes(query)) ||
          (v.barcode && v.barcode.toLowerCase().includes(query)) ||
          product.name.toLowerCase().includes(query)
        )
        return (matchingVariants.length > 0 ? matchingVariants : activeVariants).map((variant: any) => ({
          product,
          variant,
        }))
      }

      return activeVariants.map((variant: any) => ({ product, variant }))
    })
  }, [filteredProducts, searchQuery])

  const totalProductsCount = products?.length ?? 0

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (displayItems.length === 1) {
        const item = displayItems[0]
        onAddItem({
          variantId: item.variant.id,
          productName: item.product.name,
          variantName: item.variant.name,
          unitPrice: Number(item.variant.sale_price),
          stockAvailable: Number(item.variant.stock_quantity),
          unit: item.variant.unit,
          imageUrl: item.variant.image_url || item.product.image_url,
        })
        setSearchQuery('')
      }
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      {/* Barra de Búsqueda y Chips de Categorías (Fijos en la parte superior) */}
      <div className="shrink-0 space-y-2 mb-3">
        {/* Barra de Búsqueda Unificada y Filtrado Rápido */}
        <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-[#5A5D5A] pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar por nombre o escanear código de barras..."
            aria-label="Buscar producto por nombre o código de barras"
            className="w-full pl-9 pr-24 py-2 text-xs text-[#242423] bg-white border border-[#CFDBD5] rounded-xl placeholder-[#5A5D5A]/70 focus:outline-none focus:border-[#242423] shadow-2xs transition"
          />
          <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="text-[#5A5D5A] hover:text-[#242423] p-0.5 rounded transition text-xs"
              >
                ✕
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-[#5A5D5A] bg-[#E8EDDF] px-1.5 py-0.5 rounded border border-[#CFDBD5]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Escanear</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chips de Categorías Compactos */}
      {categories && categories.length > 0 && (
        <div
          role="tablist"
          aria-label="Filtro de categorías de productos"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategoryId === null}
            aria-label="Todas las categorías"
            onClick={() => setSelectedCategoryId(null)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
              selectedCategoryId === null
                ? 'bg-[#242423] text-white border-[#242423] shadow-2xs'
                : 'bg-white text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5]/60 border-[#CFDBD5]'
            }`}
          >
            Todas ({totalProductsCount})
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Filtrar por categoría ${cat.name}`}
                onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-[#242423] text-white border-[#242423] shadow-2xs'
                    : 'bg-white text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5]/60 border-[#CFDBD5]'
                }`}
              >
                {cat.name}
                {cat.product_count !== undefined && (
                  <span className="ml-1 opacity-80 font-normal">
                    ({cat.product_count})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
      </div>

      {/* Área Scrolleable Exclusiva de Productos */}
      <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin">
        {/* Estado de carga */}
        {productsLoading && (
          <div className="py-12 text-center text-[#5A5D5A] text-xs">
            <p>Cargando catálogo de productos...</p>
          </div>
        )}

      {/* Estado vacío cuando no hay resultados de búsqueda o categoría */}
      {!productsLoading && displayItems.length === 0 && (
        <div className="py-12 text-center bg-white rounded-2xl border border-[#CFDBD5] p-6 shadow-xs">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#E8EDDF]/60 border border-[#CFDBD5] flex items-center justify-center text-[#5A5D5A]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="font-bold text-sm text-[#242423]">No se encontraron productos</p>
          <p className="text-xs text-[#5A5D5A] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No hay coincidencias para "${searchQuery}"${selectedCategoryId ? ' en esta categoría' : ''}.`
              : 'Esta categoría no tiene productos activos registrados.'}
          </p>
          {(searchQuery || selectedCategoryId) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategoryId(null)
              }}
              className="mt-3.5 px-4 py-1.5 rounded-lg bg-[#E5E5E5] hover:bg-[#CFDBD5] text-[#242423] text-xs font-semibold transition"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      )}

      {/* Cuadrícula de Productos Auto-ajustable con Nombres Completos */}
      {!productsLoading && displayItems.length > 0 && (
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {displayItems.map(({ product, variant }) => {
            const unitObj = PRODUCT_UNITS.find((u) => u.value === variant.unit)
            const unitSymbol = unitObj ? unitObj.symbol : 'u'
            const imgSrc = variant.image_url || product.image_url
            const isOutOfStock = Number(variant.stock_quantity) <= 0
            const fullName = `${product.name}${variant.name !== 'Único' ? ` (${variant.name})` : ''}`

            return (
              <button
                key={variant.id}
                type="button"
                title={fullName}
                aria-label={`Agregar ${fullName} al carrito`}
                onClick={() =>
                  onAddItem({
                    variantId: variant.id,
                    productName: product.name,
                    variantName: variant.name,
                    unitPrice: Number(variant.sale_price),
                    stockAvailable: Number(variant.stock_quantity),
                    unit: variant.unit,
                    imageUrl: imgSrc,
                  })
                }
                className={`group bg-white text-[#242423] rounded-xl p-3 text-left hover:bg-[#E8EDDF]/40 hover:border-[#242423]/40 transition border shadow-2xs flex flex-col justify-between active:scale-[0.98] select-none min-h-[110px] ${
                  isOutOfStock ? 'border-[#F0B2B4] bg-[#FDF0ED]/30' : 'border-[#CFDBD5]'
                }`}
              >
                <div className="w-full">
                  {imgSrc && (
                    <img
                      src={imgSrc}
                      alt={product.name}
                      className="w-full h-24 object-cover rounded-lg mb-2 bg-[#E8EDDF]/40 border border-[#CFDBD5]"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  )}
                  <h3
                    className="font-semibold text-xs sm:text-[13px] leading-snug text-[#242423] break-words"
                    title={fullName}
                  >
                    {product.name}
                  </h3>
                  {variant.name !== 'Único' && (
                    <p className="text-[11px] text-[#5A5D5A] mt-0.5 break-words font-medium">
                      {variant.name}
                    </p>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#CFDBD5] flex justify-between items-baseline gap-2">
                  <p className="text-xs font-bold text-[#242423] font-mono shrink-0">
                    {currency} {Number(variant.sale_price).toFixed(2)}
                  </p>
                  <p
                    className={`text-[11px] font-medium font-mono shrink-0 ${
                      isOutOfStock ? 'text-[#BC4749] font-bold' : 'text-[#5A5D5A]'
                    }`}
                  >
                    {isOutOfStock ? 'Sin stock' : `${Number(variant.stock_quantity)} ${unitSymbol}`}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
import { useState } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { ProductTable } from './components/ProductTable'
import { InventoryDrawer } from './components/InventoryDrawer'
import { CreateProductModal } from './components/CreateProductModal'
import { CategoriesModal } from './components/CategoriesModal'

import { InventoryNavTabs } from './components/InventoryNavTabs'
import { LoadingScreen } from '../../shared/components/LoadingScreen'

export function InventoryPage() {
  const { storeId, loading } = useStoreId()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false)
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false)

  if (loading) return <LoadingScreen message="Cargando catálogo e inventario..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-inventory-view">
      {/* Submenú lateral opcional de Inventario */}
      <InventoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Cabecera principal con título y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">Inventario</h1>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Catálogo de productos, existencias, variantes, lotes y etiquetas de código de barras.
          </p>
        </div>

        {/* Acciones directas del catálogo */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCategoriesModalOpen(true)}
            className="px-3.5 py-2 rounded-md bg-white hover:bg-[#E5E5E5]/70 text-[#242423] text-xs font-medium border border-[#CFDBD5] flex items-center gap-2 transition-colors shadow-xs"
          >
            <svg className="w-4 h-4 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            Gestionar categorías
          </button>

          <button
            type="button"
            onClick={() => setIsNewProductModalOpen(true)}
            className="px-4 py-2 rounded-md bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo producto
          </button>
        </div>
      </div>

      {/* Pestañas Horizontales de Submódulos de Inventario */}
      <InventoryNavTabs />

      {/* Lista de productos */}
      <ProductTable storeId={storeId} />

      {/* Modales de Gestión de Inventario */}
      <CreateProductModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        storeId={storeId}
      />

      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        storeId={storeId}
      />
    </div>
  )
}
export default InventoryPage
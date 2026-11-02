import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { CategoryForm } from './components/CategoryForm'
import { InventoryDrawer } from './components/InventoryDrawer'
import { LoadingScreen } from '../../shared/components/LoadingScreen'

export function AddCategoryPage() {
  const { storeId, loading } = useStoreId()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  if (loading) return <LoadingScreen message="Cargando formulario de categoría..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <InventoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            to="/inventario"
            className="inline-flex items-center text-xs text-[#5A5D5A] hover:text-[#242423] transition gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inventario
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">Categorías</h1>
          <p className="text-xs text-[#5A5D5A] mt-0.5">
            Cree y administre las clasificaciones para organizar los productos del catálogo comercial.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#CFDBD5] p-6 rounded-xl shadow-xs">
        <CategoryForm storeId={storeId} />
      </div>
    </div>
  )
}
export default AddCategoryPage

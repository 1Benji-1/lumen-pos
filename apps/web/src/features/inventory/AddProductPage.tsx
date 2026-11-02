import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { VariantForm } from './components/VariantForm'
import { InventoryDrawer } from './components/InventoryDrawer'
import { LoadingScreen } from '../../shared/components/LoadingScreen'

export function AddProductPage() {
  const navigate = useNavigate()
  const { storeId, loading } = useStoreId()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  if (loading) return <LoadingScreen message="Cargando formulario de producto..." />
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
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">Agregar producto</h1>
          <p className="text-xs text-[#5A5D5A] mt-0.5">
            Complete los datos del producto. El campo de código de barras recibe el enfoque para escaneo directo.
          </p>
        </div>
      </div>

      <VariantForm
        storeId={storeId}
        onSuccess={() => navigate('/inventario')}
        onCancel={() => navigate('/inventario')}
      />
    </div>
  )
}
export default AddProductPage

import { useStoreId } from '../../shared/hooks/useStoreId'
import { CategoryForm } from './components/CategoryForm'
import { VariantForm } from './components/VariantForm'
import { ProductTable } from './components/ProductTable'

export function InventoryPage() {
  const { storeId, loading } = useStoreId()

  if (loading) return <div className="text-white p-8">Cargando...</div>
  if (!storeId) return <div className="text-white p-8">No se encontró tu tienda.</div>

  return (
    <div className="p-8">
      <CategoryForm storeId={storeId} />
      <VariantForm storeId={storeId} />
      <ProductTable storeId={storeId} />
    </div>
  )
}
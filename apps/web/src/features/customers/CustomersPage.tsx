import { useStoreId } from '../../shared/hooks/useStoreId'
import { CustomerList } from './components/CustomerList'

export function CustomersPage() {
  const { storeId, loading } = useStoreId()

  if (loading) return <div className="text-white p-8">Cargando...</div>
  if (!storeId) return <div className="text-white p-8">No se encontró tu tienda.</div>

  return <CustomerList storeId={storeId} />
}
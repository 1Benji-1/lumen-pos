import { useStoreId } from '../../shared/hooks/useStoreId'
import { CustomerList } from './components/CustomerList'
import { LoadingScreen } from '../../shared/components/LoadingScreen'

export function CustomersPage() {
  const { storeId, loading } = useStoreId()

  if (loading) return <LoadingScreen message="Cargando cartera de clientes..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>

  return <CustomerList storeId={storeId} />
}

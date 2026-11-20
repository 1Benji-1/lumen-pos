import { useOrganizationId } from '../../core/organizations/useOrganizationId'
import { CustomerList } from './components/CustomerList'
import { LoadingScreen } from '../../shared/components/LoadingScreen'

export function CustomersPage() {
  const { organizationId: storeId, loading } = useOrganizationId()

  if (loading) return <LoadingScreen message="Cargando cartera de clientes..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu organización asociada.</div>

  return <CustomerList storeId={storeId} />
}

import { AREA_NAMES } from '@lumen-pos/types'
import { useOrganizationModules } from '../../core/access/useOrganizationModules'
import { RetailDashboardPage } from '../legacy/DashboardPage'
import { AreaOverview } from '../overview/AreaOverview'

export function CommerceHome() {
  const { compatibilityMode, canAccessModule } = useOrganizationModules()
  const inventory = canAccessModule('inventory')
  if (!compatibilityMode && inventory && canAccessModule('pos')) return <RetailDashboardPage />

  return <AreaOverview
    areaName={AREA_NAMES.commerce}
    heading={inventory ? 'Catálogo y existencias' : 'Operación comercial'}
    summary="Consulta las herramientas disponibles para las ventas y el abastecimiento."
    priorities={['inventory', 'pos', 'customers', 'staff', 'analytics', 'settings']}
  />
}

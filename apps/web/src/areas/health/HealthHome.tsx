import { AREA_NAMES } from '@lumen-pos/types'
import { useOrganizationModules } from '../../core/access/useOrganizationModules'
import { AreaOverview } from '../overview/AreaOverview'

export function HealthHome() {
  const { compatibilityMode } = useOrganizationModules()
  return <AreaOverview
    areaName={AREA_NAMES.health}
    heading="Gestión del consultorio"
    summary="Gestiona el equipo y los ajustes. Agenda y Gestión clínica están en preparación."
    priorities={compatibilityMode
      ? ['staff', 'pos', 'customers', 'inventory', 'analytics', 'settings']
      : ['staff', 'settings']}
  />
}

import { AREA_NAMES } from '@lumen-pos/types'
import { AreaOverview } from '../overview/AreaOverview'

export function GastronomyHome() {
  return <AreaOverview
    areaName={AREA_NAMES.gastronomy}
    heading="Operación gastronómica"
    summary="Consulta las ventas y las alertas de insumos según las herramientas disponibles."
    priorities={['pos', 'inventory', 'customers', 'staff', 'analytics', 'settings']}
  />
}

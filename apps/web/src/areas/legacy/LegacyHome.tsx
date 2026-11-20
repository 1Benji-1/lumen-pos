import { AreaOverview } from '../overview/AreaOverview'

export function LegacyHome() {
  return <AreaOverview
    areaName="Perfil anterior"
    heading="Operación de la organización"
    summary="Accede a las herramientas que ya utiliza tu organización."
    priorities={['pos', 'customers', 'inventory', 'staff', 'analytics', 'settings']}
  />
}

import { CommerceHome } from '../../areas/commerce/CommerceHome'
import { GastronomyHome } from '../../areas/gastronomy/GastronomyHome'
import { HealthHome } from '../../areas/health/HealthHome'
import { LegacyHome } from '../../areas/legacy/LegacyHome'
import { useOrganizationModules } from '../../core/access/useOrganizationModules'
import { LoadingScreen } from '../../shared/components/LoadingScreen'

export function OrganizationHome() {
  const { areaId, compatibilityMode, isLoading, error } = useOrganizationModules()
  if (isLoading) return <LoadingScreen message="Cargando inicio..." />
  if (error || (!areaId && !compatibilityMode)) {
    return <p role="alert" className="p-8 text-sm text-[#BC4749]">No se pudo cargar el área de la organización.</p>
  }

  switch (areaId) {
    case 'commerce': return <CommerceHome />
    case 'gastronomy': return <GastronomyHome />
    case 'health': return <HealthHome />
    default: return <LegacyHome />
  }
}

import type { ReactNode } from 'react'
import { BUSINESS_TYPES, type ModuleId } from '@lumen-pos/types'
import { useStoreModules } from '../hooks/useStoreModules'
import { LoadingScreen } from '../components/LoadingScreen'
import { PlanRestrictionView } from '../components/PlanRestrictionView'

export function ModuleGuard({
  module,
  children,
}: {
  module: ModuleId
  children?: ReactNode
}) {
  const {
    isLoading,
    businessType,
    isModuleAllowedInBusinessType,
    canAccessModule,
  } = useStoreModules()

  if (isLoading) {
    return <LoadingScreen message="Comprobando permisos de módulo..." />
  }

  const rubroConfig = BUSINESS_TYPES[businessType]

  if (!isModuleAllowedInBusinessType(module)) {
    return (
      <PlanRestrictionView
        title="Módulo no disponible para tu rubro"
        description={`Este módulo no está habilitado para el rubro comercial ${rubroConfig?.name ?? 'actual'}.`}
      />
    )
  }

  if (!canAccessModule(module)) {
    return (
      <PlanRestrictionView
        title="Módulo no disponible en tu plan actual"
        description="Esta funcionalidad no está incluida en tu suscripción. Consulta con tu coordinador o soporte técnico para ampliar tus capacidades."
      />
    )
  }

  return children ? <>{children}</> : null
}

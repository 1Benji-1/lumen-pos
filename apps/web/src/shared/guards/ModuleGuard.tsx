import type { ReactNode } from 'react'
import { type ModuleId } from '@lumen-pos/types'
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
    error,
    getModuleAccess,
  } = useStoreModules()

  if (isLoading) {
    return <LoadingScreen message="Comprobando permisos de módulo..." />
  }

  if (error) {
    return <PlanRestrictionView title="No se pudo comprobar el acceso" description="Vuelve a intentarlo cuando se restablezca la conexión." />
  }
  const access = getModuleAccess(module)

  if (access.reason === 'category_disabled' || access.reason === 'organization_disabled') {
    return (
      <PlanRestrictionView
        title="Módulo no está activo"
        description="Este módulo no está activo para esta operación. Consulta su configuración con el propietario."
      />
    )
  }

  if (!access.allowed) {
    return (
      <PlanRestrictionView
        title="Módulo no disponible en tu plan actual"
        description="Esta funcionalidad no está incluida en tu suscripción. Consulta con tu coordinador o soporte técnico para ampliar tus capacidades."
      />
    )
  }

  return children ? <>{children}</> : null
}

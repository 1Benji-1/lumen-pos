import type { ReactNode } from 'react'
import { useStoreEntitlements } from '../../../shared/hooks/useStoreEntitlements'
import { LoadingScreen } from '../../../shared/components/LoadingScreen'
import { PlanRestrictionView } from '../../../shared/components/PlanRestrictionView'

export function PlanGuard({
  feature,
  children,
}: {
  feature: string
  children: ReactNode
}) {
  const { isFeatureEnabled, planName, isLoading, error } = useStoreEntitlements()

  if (isLoading) return <LoadingScreen message="Comprobando suscripción..." />

  if (error) {
    return <PlanRestrictionView title="No se pudo comprobar el acceso" description="Vuelve a intentarlo cuando se restablezca la conexión." />
  }

  if (!isFeatureEnabled(feature)) {
    return (
      <PlanRestrictionView
        planName={planName}
      />
    )
  }

  return <>{children}</>
}

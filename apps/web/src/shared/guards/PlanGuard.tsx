import type { ReactNode } from 'react'
import { useStoreEntitlements } from '../hooks/useStoreEntitlements'
import { LoadingScreen } from '../components/LoadingScreen'
import { PlanRestrictionView } from '../components/PlanRestrictionView'

export function PlanGuard({
  feature,
  children,
}: {
  feature: string
  children: ReactNode
}) {
  const { isFeatureEnabled, planName, isLoading, error } = useStoreEntitlements()

  if (isLoading) return <LoadingScreen message="Comprobando suscripción..." />

  if (error || !isFeatureEnabled(feature)) {
    return (
      <PlanRestrictionView
        planName={planName}
      />
    )
  }

  return <>{children}</>
}

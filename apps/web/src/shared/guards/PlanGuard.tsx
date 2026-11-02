import type { ReactNode } from 'react'
import { useStoreId } from '../hooks/useStoreId'
import { useStorePlan } from '../hooks/useStorePlan'
import { LoadingScreen } from '../components/LoadingScreen'
import { PlanRestrictionView } from '../components/PlanRestrictionView'

export function PlanGuard({
  feature,
  children,
}: {
  feature: string
  children: ReactNode
}) {
  const { storeId } = useStoreId()
  const { data, isLoading } = useStorePlan(storeId)

  if (isLoading) return <LoadingScreen message="Comprobando suscripción..." />

  const planFeatures = ((data?.plans as any)?.features as Record<string, boolean> | undefined) ?? {}
  const overrides = (data?.feature_overrides as Record<string, boolean> | null) ?? {}

  // Las excepciones de la tienda mandan por encima del plan
  const effectiveFeatures: Record<string, boolean> = { ...planFeatures, ...overrides }
  const hasAccess = effectiveFeatures[feature] === true

  if (!hasAccess) {
    return (
      <PlanRestrictionView
        planName={(data?.plans as any)?.name}
      />
    )
  }

  return <>{children}</>
}
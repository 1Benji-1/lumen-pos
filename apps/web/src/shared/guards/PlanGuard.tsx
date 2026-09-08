import type { ReactNode } from 'react'
import { useStoreId } from '../hooks/useStoreId'
import { useStorePlan } from '../hooks/useStorePlan'

export function PlanGuard({
  feature,
  children,
}: {
  feature: string
  children: ReactNode
}) {
  const { storeId } = useStoreId()
  const { data, isLoading } = useStorePlan(storeId)

  if (isLoading) return <div className="text-white p-8">Cargando...</div>

  const planFeatures = (data?.plans as any)?.features ?? {}
  const overrides = data?.feature_overrides ?? {}

  // Las excepciones de la tienda mandan por encima del plan
  const effectiveFeatures = { ...planFeatures, ...overrides }
  const hasAccess = effectiveFeatures[feature] === true

  if (!hasAccess) {
    return (
      <div className="text-white p-8 text-center">
        <p className="text-2xl mb-2">🔒</p>
        <p className="font-bold mb-1">Esta función no está disponible en tu plan actual.</p>
        <p className="text-slate-400 text-sm">
          Plan actual: {(data?.plans as any)?.name ?? 'Sin plan'}. Contacta al soporte para
          subir de plan.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
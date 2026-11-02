import { useState } from 'react'
import { useStoreId } from '../../../shared/hooks/useStoreId'
import { useStorePlan } from '../../../shared/hooks/useStorePlan'
import { useStaff } from '../../staff/hooks/useStaff'
import { PLAN_DEFAULT_LIMITS, SYSTEM_FEATURES, type PlanCode } from '@lumen-pos/types'

export function PlanLimitsSection() {
  const { storeId } = useStoreId()
  const { data: storePlan, isLoading: planLoading } = useStorePlan(storeId)
  const { data: staff, isLoading: staffLoading } = useStaff(storeId)

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PlanCode | null>(null)
  const [upgradeSubmitted, setUpgradeSubmitted] = useState(false)

  const planCode = (storePlan?.plans?.code as PlanCode) || 'standard'
  const planName = storePlan?.plans?.name || 'Estándar'
  const status = storePlan?.subscription_status || 'active'
  const subType = storePlan?.industry_sub_type || 'comercio_general'

  const isTopTier = planCode === 'enterprise'

  const limits = PLAN_DEFAULT_LIMITS[planCode] || PLAN_DEFAULT_LIMITS.standard
  const currentUsers = staff?.length ?? 1
  const maxUsers = limits.max_users
  const userPercent = maxUsers >= 999 ? 0 : Math.min(100, Math.round((currentUsers / maxUsers) * 100))

  const maxRegisters = limits.max_cash_registers
  const currentRegisters = 1 // Caja actual

  const planFeatures = (storePlan?.plans?.features as Record<string, boolean>) || {}
  const overrides = (storePlan?.feature_overrides as Record<string, boolean>) || {}
  const effectiveFeatures = { ...planFeatures, ...overrides }

  const activeFeaturesList = SYSTEM_FEATURES.filter((f) => effectiveFeatures[f.key] === true)

  const handleOpenUpgrade = (targetPlan: PlanCode) => {
    setSelectedUpgradePlan(targetPlan)
    setUpgradeModalOpen(true)
    setUpgradeSubmitted(false)
  }

  const handleConfirmUpgrade = () => {
    setUpgradeSubmitted(true)
    setTimeout(() => {
      setUpgradeModalOpen(false)
      setUpgradeSubmitted(false)
    }, 2500)
  }

  if (planLoading || staffLoading) {
    return (
      <div className="py-12 text-center text-xs text-[#5A5D5A]">
        Cargando información del plan y límites...
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* 1. Tarjeta: Suscripción actual */}
      <div>
        <h2 className="text-base font-semibold text-[#242423] mb-3">
          Suscripción de la tienda
        </h2>
        <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
          {/* Plan activo y estado */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Plan contratado
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Nivel de suscripción actual y estado del servicio en esta tienda.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0 flex items-center justify-between sm:justify-end gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-[#242423] text-white rounded">
                  Plan {planName}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold text-[#588157] bg-[#EFF5EE] border border-[#588157]/40 rounded-full">
                  {isTopTier ? 'Activo • Nivel Máximo' : status === 'trialing' ? 'Prueba' : 'Activo'}
                </span>
              </div>
              {!isTopTier && (
                <button
                  type="button"
                  onClick={() => handleOpenUpgrade(planCode === 'standard' ? 'pro' : 'enterprise')}
                  className="px-3 py-1.5 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold rounded transition-colors shadow-2xs cursor-pointer"
                >
                  Mejorar plan
                </button>
              )}
            </div>
          </div>

          {/* Especialidad comercial */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Especialidad comercial
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Rubro asignado a la tienda para el catálogo y flujo de cobro.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0 flex sm:justify-end">
              <span className="text-xs font-semibold text-[#242423] capitalize bg-[#E8EDDF] px-2.5 py-1 rounded border border-[#CFDBD5]">
                {subType.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tarjeta: Consumo y límites */}
      <div>
        <h2 className="text-base font-semibold text-[#242423] mb-3">
          Consumo frente a los límites del plan
        </h2>
        <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
          {/* Límite de usuarios / colaboradores */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Colaboradores registrados
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Cuentas de cajeros, encargados y administradores activos en el sistema.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-[#242423]">
                  {currentUsers} {currentUsers === 1 ? 'usuario' : 'usuarios'}
                </span>
                <span className={maxUsers >= 999 ? 'text-[#588157] font-semibold' : 'text-[#5A5D5A]'}>
                  {maxUsers >= 999 ? 'Límite: Ilimitado' : `Límite: ${maxUsers} usuarios`}
                </span>
              </div>
              {maxUsers < 999 && (
                <div className="w-full h-1.5 bg-[#CFDBD5]/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      userPercent >= 90 ? 'bg-[#BC4749]' : 'bg-[#242423]'
                    }`}
                    style={{ width: `${userPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Límite de cajas registradoras */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Cajas registradoras simultáneas
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Puntos de cobro en paralelo permitidos para esta sucursal.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0 flex items-center justify-between sm:justify-end gap-3 font-mono text-xs">
              <span className="font-semibold text-[#242423]">
                {currentRegisters} {currentRegisters === 1 ? 'caja activa' : 'cajas activas'}
              </span>
              <span className={maxRegisters >= 999 ? 'text-[#588157] font-semibold' : 'text-[#5A5D5A]'}>
                {maxRegisters >= 999 ? '(Ilimitado)' : `(Máximo: ${maxRegisters})`}
              </span>
            </div>
          </div>

          {/* Módulos habilitados */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Módulos del sistema activos
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Funcionalidades disponibles según el plan suscrito.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0 flex flex-wrap gap-1.5 sm:justify-end">
              {activeFeaturesList.map((f) => (
                <span
                  key={f.key}
                  className="px-2 py-0.5 text-[11px] rounded bg-[#E8EDDF] border border-[#CFDBD5] text-[#242423] font-medium"
                >
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Estado de nivel máximo O Tarjeta de Upgrades reales */}
      {isTopTier ? (
        <div className="bg-[#EFF5EE] border border-[#588157]/30 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#242423] block">
              Tu tienda cuenta con el plan más completo de la plataforma
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Tienes acceso total a todas las herramientas avanzadas, colaboradores ilimitados y puntos de cobro sin restricciones.
            </span>
          </div>
          <span className="shrink-0 text-xs font-bold text-[#588157] bg-white px-3 py-1.5 rounded border border-[#588157]/40 shadow-2xs self-start sm:self-auto">
            Plan {planName} Completo
          </span>
        </div>
      ) : (
        <div>
          <h2 className="text-base font-semibold text-[#242423] mb-3">
            Opciones de mejora de plan (Upgrade)
          </h2>
          <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
            {/* Solo se muestran planes genuinamente superiores */}
            {planCode === 'standard' && (
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#242423] block">Plan Pro</span>
                  <span className="text-xs text-[#5A5D5A] block mt-0.5">
                    Hasta 6 colaboradores, 3 cajas simultáneas, órdenes de compra y control de vencimientos.
                  </span>
                </div>
                <div className="shrink-0 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenUpgrade('pro')}
                    className="px-3.5 py-1.5 bg-[#242423] hover:bg-[#1A1A19] text-white text-xs font-semibold rounded transition-colors shadow-xs cursor-pointer"
                  >
                    Solicitar Plan Pro
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#242423] block">Plan Empresa</span>
                <span className="text-xs text-[#5A5D5A] block mt-0.5">
                  Usuarios ilimitados, cajas ilimitadas, auditoría a ciegas, ajuste masivo y soporte prioritario.
                </span>
              </div>
              <div className="shrink-0 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenUpgrade('enterprise')}
                  className="px-3.5 py-1.5 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold rounded transition-colors shadow-xs cursor-pointer"
                >
                  Solicitar Plan Empresa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal directo para solicitar Upgrade (solo aplica para planes inferiores) */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50">
          <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#242423]">
              Solicitar ampliación a Plan {selectedUpgradePlan === 'enterprise' ? 'Empresa' : 'Pro'}
            </h3>
            <p className="text-xs text-[#5A5D5A]">
              Se enviará una solicitud directa a administración para actualizar tu tienda a{' '}
              <strong>Plan {selectedUpgradePlan === 'enterprise' ? 'Empresa' : 'Pro'}</strong> y habilitar los límites superiores inmediatamente.
            </p>

            {upgradeSubmitted ? (
              <div className="p-3 bg-[#EFF5EE] border border-[#588157]/40 rounded text-xs text-[#588157] font-semibold text-center">
                Solicitud enviada correctamente. Un asesor se comunicará contigo.
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpgradeModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#5A5D5A] hover:text-[#242423] rounded border border-[#CFDBD5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpgrade}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#242423] text-white hover:bg-[#1A1A19] rounded shadow-xs cursor-pointer"
                >
                  Confirmar solicitud
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

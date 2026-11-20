import { useState } from 'react'
import { useOrganizationId } from '../../../core/organizations/useOrganizationId'
import { useOrganizationPlan } from '../../../core/subscriptions/useOrganizationPlan'
import { useOrganizationEntitlements } from '../../../core/subscriptions/useOrganizationEntitlements'
import { useOrganizationModules } from '../../../core/access/useOrganizationModules'
import { useStaff } from '../../staff/hooks/useStaff'
import { AREA_NAMES, PLAN_DEFAULT_LIMITS, SYSTEM_FEATURES, type PlanCode } from '@lumen-pos/types'

export function PlanLimitsSection() {
  const { organizationId: storeId } = useOrganizationId()
  const { data: storePlan, isLoading: planLoading } = useOrganizationPlan(storeId)
  const { isFeatureEnabled, getLimit } = useOrganizationEntitlements()
  const { areaId, compatibilityMode, isLoading: modulesLoading, canAccessModule } = useOrganizationModules()
  const { data: staff, isLoading: staffLoading } = useStaff(storeId)

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PlanCode | null>(null)
  const [upgradeSubmitted, setUpgradeSubmitted] = useState(false)

  const planCode = (storePlan?.plan?.code as PlanCode) || 'standard'
  const planName = storePlan?.plan?.name || 'Estándar'
  const status = storePlan?.subscriptionStatus || 'active'

  const isTopTier = planCode === 'enterprise'

  const limits = PLAN_DEFAULT_LIMITS[planCode] || PLAN_DEFAULT_LIMITS.standard
  const currentUsers = staff?.length ?? 1
  const maxUsers = getLimit('max_users') ?? limits.max_users
  const userPercent = maxUsers >= 999 ? 0 : Math.min(100, Math.round((currentUsers / maxUsers) * 100))

  const maxRegisters = getLimit('max_cash_registers') ?? limits.max_cash_registers
  const currentRegisters = 1 // Caja actual

  const hasSales = canAccessModule('pos')
  const hasInventory = canAccessModule('inventory')
  const categories = {
    pos: hasSales,
    inventario: hasInventory,
    reportes: canAccessModule('analytics'),
    general: true,
  }
  const activeFeaturesList = SYSTEM_FEATURES.filter((feature) => categories[feature.category] && isFeatureEnabled(feature.key))
  const areaName = areaId ? AREA_NAMES[areaId] : compatibilityMode ? 'Perfil anterior' : null

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

  if (planLoading || staffLoading || modulesLoading) {
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
          Suscripción de la organización
        </h2>
        <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
          {/* Plan activo y estado */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Plan contratado
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Nivel de suscripción actual y estado del servicio en esta organización.
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

          {/* Área de la organización */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Área de la organización
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                El área define las herramientas iniciales de la organización.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0 flex sm:justify-end">
              {areaName ? <span className="text-xs font-semibold text-[#242423] bg-[#E8EDDF] px-2.5 py-1 rounded border border-[#CFDBD5]">
                {areaName}
              </span> : <span className="text-xs text-[#BC4749]">Área no disponible</span>}
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

          {hasSales && <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Cajas registradoras simultáneas
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Puntos de cobro en paralelo que permite el plan.
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
          </div>}

          {/* Módulos habilitados */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Funciones disponibles del plan
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
              Tu organización cuenta con el plan más completo de la plataforma
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Tienes los límites más altos para las herramientas disponibles en tu área.
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
                    Hasta 6 colaboradores{hasSales ? ', 3 cajas simultáneas' : ''}{hasInventory ? ', órdenes de compra y control de vencimientos' : ''}.
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
                  El mayor límite de usuarios{hasSales ? ' y cajas' : ''}{hasInventory ? ', auditoría a ciegas y ajuste masivo de inventario' : ''}.
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
              Se enviará una solicitud directa a administración para actualizar tu organización a{' '}
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

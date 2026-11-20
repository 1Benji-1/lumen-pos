import { useState, useEffect } from 'react'
import { SYSTEM_FEATURES, type AdminStoreItem } from '@lumen-pos/types'
import { useUpdateStoreFeatures } from '../hooks/useAdminStores'
import { ConfirmationModal, type ChangeItem } from '../../../shared/components/ConfirmationModal'
import { useToast } from '../../../shared/context/ToastContext'

interface StoreOverridesTabProps {
  store: AdminStoreItem
}

export function StoreOverridesTab({ store }: StoreOverridesTabProps) {
  const { toast } = useToast()
  const [overrides, setOverrides] = useState<Record<string, any>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<ChangeItem[]>([])

  const updateMutation = useUpdateStoreFeatures()

  useEffect(() => {
    setOverrides(store.feature_overrides || {})
    setErrorMessage(null)
    setIsConfirmOpen(false)
    setPendingChanges([])
  }, [store.id, store.feature_overrides])

  function handleOverrideChange(featureKey: string, value: 'default' | 'true' | 'false') {
    setOverrides((prev) => {
      const next = { ...prev }
      if (value === 'default') {
        delete next[featureKey]
      } else {
        next[featureKey] = value === 'true'
      }
      return next
    })
  }

  function handleLimitOverrideChange(limitKey: string, value: string) {
    setOverrides((prev) => {
      const next = { ...prev }
      if (value === '' || value === 'default') {
        delete next[limitKey]
      } else {
        const num = parseInt(value, 10)
        if (!isNaN(num) && num > 0) {
          next[limitKey] = num
        }
      }
      return next
    })
  }

  function handleRequestSave() {
    setErrorMessage(null)

    const prevOverrides = store.feature_overrides || {}
    const allKeys = Array.from(new Set([...Object.keys(prevOverrides), ...Object.keys(overrides)]))
    const changes: ChangeItem[] = []

    const limitLabels: Record<string, string> = {
      max_products: 'Límite de productos',
      max_cash_registers: 'Límite de cajas registradoras',
      max_users: 'Límite de colaboradores',
      max_staff_users: 'Límite de colaboradores',
    }

    const formatValue = (val: any) => {
      if (val === undefined) return 'Por defecto de plan'
      if (typeof val === 'boolean') return val ? 'Habilitado' : 'Deshabilitado'
      return String(val)
    }

    for (const key of allKeys) {
      const prevVal = prevOverrides[key]
      const nextVal = overrides[key]
      if (prevVal !== nextVal) {
        const featureDef = SYSTEM_FEATURES.find((f) => f.key === key)
        const label = featureDef?.name || limitLabels[key] || key
        changes.push({
          label,
          before: formatValue(prevVal),
          after: formatValue(nextVal),
        })
      }
    }

    if (changes.length === 0) {
      toast.info('No se detectaron modificaciones en las funciones.')
      return
    }

    setPendingChanges(changes)
    setIsConfirmOpen(true)
  }

  async function handleExecuteSave() {
    setErrorMessage(null)

    try {
      await updateMutation.mutateAsync({
        storeId: store.id,
        featureOverrides: overrides,
      })
      setIsConfirmOpen(false)
      toast.success('Excepciones de funciones guardadas correctamente.')
    } catch (err: any) {
      setIsConfirmOpen(false)
      const msg = err.message || 'Error al actualizar las funciones de la tienda.'
      setErrorMessage(msg)
      toast.error(msg)
    }
  }

  const activeOverridesCount = Object.keys(overrides).length

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                Límites Cuantitativos y Permisos Especiales
              </h3>
              {activeOverridesCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                  {activeOverridesCount} {activeOverridesCount === 1 ? 'excepción activa' : 'excepciones activas'}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Personaliza capacidades y límites operativos para esta tienda sin alterar las reglas globales de su plan contratado ({store.plan_name || 'Sin plan'}).
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestSave}
            disabled={updateMutation.isPending}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 disabled:opacity-50 text-xs font-semibold transition shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar excepciones'}
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="pt-5 space-y-6">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Límites Cuantitativos de Recursos
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Plan base: <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{store.plan_name}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <label htmlFor="limit-cash-registers" className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    Cajas registradoras simultáneas
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Defecto: {store.plan_features?.max_cash_registers ?? (store.plan_code === 'standard' ? 1 : store.plan_code === 'pro' ? 3 : 'Ilimitadas')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="limit-cash-registers"
                    type="number"
                    min="1"
                    placeholder={`Heredar (${store.plan_features?.max_cash_registers || 1})`}
                    value={overrides.max_cash_registers ?? ''}
                    onChange={(e) => handleLimitOverrideChange('max_cash_registers', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />
                  {overrides.max_cash_registers !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleLimitOverrideChange('max_cash_registers', 'default')}
                      className="text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                    >
                      Restablecer
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <label htmlFor="limit-staff-users" className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    Máximo de colaboradores
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Defecto: {store.plan_features?.max_users ?? (store.plan_code === 'standard' ? 2 : store.plan_code === 'pro' ? 6 : 'Ilimitados')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="limit-staff-users"
                    type="number"
                    min="1"
                    placeholder={`Heredar (${store.plan_features?.max_users || 2})`}
                    value={overrides.max_users ?? ''}
                    onChange={(e) => handleLimitOverrideChange('max_users', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />
                  {overrides.max_users !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleLimitOverrideChange('max_users', 'default')}
                      className="text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                    >
                      Restablecer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider block">
              Módulos y Funcionalidades del Sistema
            </span>

            <div className="grid grid-cols-1 gap-3">
              {SYSTEM_FEATURES.map((feature) => {
                const planDefault = store.plan_features?.[feature.key] ?? false
                const hasOverride = feature.key in overrides
                const overrideValue = overrides[feature.key]
                const effectiveValue = hasOverride ? overrideValue : planDefault

                let currentSelectState: 'default' | 'true' | 'false' = 'default'
                if (hasOverride) {
                  currentSelectState = overrideValue ? 'true' : 'false'
                }

                const categoryBadgeColors: Record<string, string> = {
                  pos: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/60',
                  inventario: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
                  reportes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/60',
                  general: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
                }

                return (
                  <div
                    key={feature.key}
                    className={`p-4 rounded-xl border transition ${
                      hasOverride
                        ? 'bg-zinc-100/70 border-zinc-300 dark:bg-zinc-800/40 dark:border-zinc-700'
                        : 'bg-white border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${categoryBadgeColors[feature.category] || 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'}`}>
                            {feature.category}
                          </span>
                          <span className="text-xs font-semibold text-zinc-950 dark:text-white">{feature.name}</span>
                          {hasOverride && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-600 font-medium">
                              Excepción activa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {feature.description}
                        </p>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-0.5">
                          Defecto de plan ({store.plan_name}):{' '}
                          <span className={planDefault ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'}>
                            {planDefault ? 'Habilitado' : 'No disponible'}
                          </span>{' '}
                          · Estado efectivo actual:{' '}
                          <span className={`font-semibold ${effectiveValue ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {effectiveValue ? 'Habilitado' : 'Deshabilitado'}
                          </span>
                        </div>
                      </div>

                      <div className="sm:w-52 shrink-0">
                        <select
                          aria-label={`Excepción para ${feature.name}`}
                          value={currentSelectState}
                          onChange={(e) =>
                            handleOverrideChange(
                              feature.key,
                              e.target.value as 'default' | 'true' | 'false'
                            )
                          }
                          className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition cursor-pointer"
                        >
                          <option value="default">Heredar de plan ({planDefault ? 'Activo' : 'Inactivo'})</option>
                          <option value="true">Forzar: Habilitado</option>
                          <option value="false">Forzar: Deshabilitado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteSave}
        isPending={updateMutation.isPending}
        title="Confirmar excepciones de funciones (Overrides)"
        description={`Se aplicarán las siguientes excepciones sobre las reglas del plan para "${store.name}":`}
        changes={pendingChanges}
        confirmText="Guardar excepciones"
        variant="primary"
      />
    </div>
  )
}
